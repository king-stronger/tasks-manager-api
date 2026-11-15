import { describe, expect, it } from "vitest";
import { api } from "@/test/helpers.js";

describe("index", () => {
	it("responds on the public index (smoke)", async () => {
		const res = await api("/");
		expect(res.status).toBe(200);
		const body = (await res.json()) as { message: string };
		expect(body.message.toLowerCase()).toContain("tasks");
	});
});
