import { describe, expect, it } from "vitest";
import { insertLabelsSchema, updateLabelsSchema } from "@/db/schemas/labels.js";

describe("label schemas", () => {
	it("accepts a valid label insert payload", () => {
		const parsed = insertLabelsSchema.parse({
			name: "Design",
			color: "#2dd4bf",
		});
		expect(parsed.name).toBe("Design");
		expect(parsed.color).toBe("#2dd4bf");
	});

	it("rejects invalid hex colors", () => {
		expect(() =>
			insertLabelsSchema.parse({
				name: "Broken",
				color: "red",
			}),
		).toThrow();
	});

	it("allows partial updates", () => {
		const parsed = updateLabelsSchema.parse({ name: "Renamed" });
		expect(parsed.name).toBe("Renamed");
	});
});
