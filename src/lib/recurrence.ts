import type { tasks } from "@/db/schemas/tasks.js";

type Task = typeof tasks.$inferSelect;
type Recurrence = Task["recurrence"];

export function computeNextDueDate(
	from: Date,
	recurrence: Recurrence,
	interval: number,
) {
	if (recurrence === "none") {
		return null;
	}

	const next = new Date(from);
	const step = Math.max(1, interval);

	if (recurrence === "daily") {
		next.setUTCDate(next.getUTCDate() + step);
	} else if (recurrence === "weekly") {
		next.setUTCDate(next.getUTCDate() + 7 * step);
	} else if (recurrence === "monthly") {
		next.setUTCMonth(next.getUTCMonth() + step);
	}

	return next;
}

export function shouldSpawnNextOccurrence(task: Task) {
	if (task.recurrence === "none") {
		return false;
	}
	if (task.status !== "done") {
		return false;
	}

	const base = task.dueDate ?? new Date();
	const nextDue = computeNextDueDate(
		base,
		task.recurrence,
		task.recurrenceInterval,
	);
	if (!nextDue) {
		return false;
	}
	if (task.recurrenceEndDate && nextDue > task.recurrenceEndDate) {
		return false;
	}

	return true;
}

export function buildNextOccurrenceValues(task: Task) {
	const base = task.dueDate ?? new Date();
	const nextDue = computeNextDueDate(
		base,
		task.recurrence,
		task.recurrenceInterval,
	);

	return {
		userId: task.userId,
		assigneeId: task.assigneeId,
		projectId: task.projectId,
		name: task.name,
		description: task.description,
		status: "todo" as const,
		priority: task.priority,
		dueDate: nextDue,
		position: task.position,
		recurrence: task.recurrence,
		recurrenceInterval: task.recurrenceInterval,
		recurrenceEndDate: task.recurrenceEndDate,
	};
}
