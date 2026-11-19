import { describe, expect, it } from "vitest";
import { api } from "@/test/helpers.js";
import {
	PRIVATE_CACHE_CONTROL,
	PUBLIC_CACHE_CONTROL,
} from "./cache-control.js";

function varyValues(res: Response) {
	return (res.headers.get("vary") ?? "")
		.split(",")
		.map((value) => value.trim().toLowerCase());
}

describe("cache-control", () => {
	it.each(["/", "/docs"])("marks %s as publicly cacheable", async (path) => {
		const res = await api(path);
		expect(res.status).toBe(200);
		expect(res.headers.get("cache-control")).toBe(PUBLIC_CACHE_CONTROL);
		expect(varyValues(res)).not.toContain("cookie");
	});

	it("keeps authenticated routes private, even when unauthorized", async () => {
		const res = await api("/tasks");
		expect(res.status).toBe(401);
		expect(res.headers.get("cache-control")).toBe(PRIVATE_CACHE_CONTROL);
		expect(varyValues(res)).toContain("cookie");
	});

	it("keeps Better Auth responses private", async () => {
		const res = await api("/api/auth/get-session");
		expect(res.headers.get("cache-control")).not.toContain("public");
		expect(varyValues(res)).toContain("cookie");
	});

	it("does not mark writes to public paths as public", async () => {
		const res = await api("/", { method: "POST" });
		expect(res.headers.get("cache-control")).toBe(PRIVATE_CACHE_CONTROL);
	});

	it("keeps the Vary: Origin set by CORS", async () => {
		const res = await api("/tasks", {
			headers: { Origin: "http://localhost:5173" },
		});
		expect(varyValues(res)).toEqual(
			expect.arrayContaining(["origin", "cookie"]),
		);
	});
});
