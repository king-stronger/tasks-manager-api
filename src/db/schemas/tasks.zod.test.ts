import { describe, expect, it } from "vitest";
import { insertTasksSchema, updateTasksSchema } from "@/db/schemas/tasks.js";

describe("task schemas", () => {
	it("accepts a valid task insert payload", () => {
		const parsed = insertTasksSchema.parse({
			name: "Ship tests",
			status: "todo",
			priority: "high",
			labelIds: [1, 2],
		});
		expect(parsed.name).toBe("Ship tests");
		expect(parsed.priority).toBe("high");
		expect(parsed.labelIds).toEqual([1, 2]);
	});

	it("rejects empty task names", () => {
		expect(() => insertTasksSchema.parse({ name: "" })).toThrow();
	});

	it("rejects invalid status values", () => {
		expect(() =>
			insertTasksSchema.parse({
				name: "Broken",
				status: "blocked",
			}),
		).toThrow();
	});

	it("allows partial updates including archive null", () => {
		const parsed = updateTasksSchema.parse({
			status: "done",
			archivedAt: null,
		});
		expect(parsed.status).toBe("done");
		expect(parsed.archivedAt).toBeNull();
	});
});
