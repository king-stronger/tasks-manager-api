import { describe, expect, it } from "vitest";
import {
	buildNextOccurrenceValues,
	computeNextDueDate,
	shouldSpawnNextOccurrence,
} from "@/lib/recurrence.js";

function taskFixture(
	overrides: Partial<Parameters<typeof shouldSpawnNextOccurrence>[0]> = {},
) {
	return {
		id: 1,
		userId: "user-1",
		assigneeId: null,
		projectId: null,
		name: "Recurring task",
		description: null,
		status: "done" as const,
		priority: "medium" as const,
		dueDate: new Date("2026-01-01T00:00:00.000Z"),
		position: 0,
		recurrence: "weekly" as const,
		recurrenceInterval: 1,
		recurrenceEndDate: null,
		archivedAt: null,
		createdAt: new Date("2026-01-01T00:00:00.000Z"),
		updatedAt: new Date("2026-01-01T00:00:00.000Z"),
		...overrides,
	};
}

describe("recurrence helpers", () => {
	it("advances due dates by recurrence unit", () => {
		const from = new Date("2026-01-01T00:00:00.000Z");
		expect(computeNextDueDate(from, "none", 1)).toBeNull();
		expect(computeNextDueDate(from, "daily", 2)?.toISOString()).toBe(
			"2026-01-03T00:00:00.000Z",
		);
		expect(computeNextDueDate(from, "weekly", 1)?.toISOString()).toBe(
			"2026-01-08T00:00:00.000Z",
		);
		expect(computeNextDueDate(from, "monthly", 1)?.toISOString()).toBe(
			"2026-02-01T00:00:00.000Z",
		);
	});

	it("spawns the next occurrence only when done and within end date", () => {
		expect(shouldSpawnNextOccurrence(taskFixture({ status: "todo" }))).toBe(
			false,
		);
		expect(shouldSpawnNextOccurrence(taskFixture({ recurrence: "none" }))).toBe(
			false,
		);
		expect(shouldSpawnNextOccurrence(taskFixture())).toBe(true);
		expect(
			shouldSpawnNextOccurrence(
				taskFixture({
					recurrenceEndDate: new Date("2026-01-05T00:00:00.000Z"),
				}),
			),
		).toBe(false);
	});

	it("builds the next occurrence as a fresh todo", () => {
		const next = buildNextOccurrenceValues(taskFixture());
		expect(next.status).toBe("todo");
		expect(next.name).toBe("Recurring task");
		expect(next.dueDate?.toISOString()).toBe("2026-01-08T00:00:00.000Z");
		expect(next.recurrence).toBe("weekly");
	});
});
