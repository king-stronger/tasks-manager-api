import { describe, expect, it } from "vitest";
import {
	insertCommentsSchema,
	updateCommentsSchema,
} from "@/db/schemas/comments.js";
import { insertChecklistItemsSchema } from "@/db/schemas/checklist-items.js";

describe("comment and checklist schemas", () => {
	it("requires a non-empty comment body", () => {
		expect(insertCommentsSchema.parse({ body: "Looks good" }).body).toBe(
			"Looks good",
		);
		expect(() => insertCommentsSchema.parse({ body: "" })).toThrow();
	});

	it("allows partial comment updates", () => {
		expect(updateCommentsSchema.parse({ body: "Edited" }).body).toBe("Edited");
	});

	it("requires a checklist title", () => {
		expect(
			insertChecklistItemsSchema.parse({ title: "Write tests" }).title,
		).toBe("Write tests");
		expect(() => insertChecklistItemsSchema.parse({ title: "" })).toThrow();
	});
});
