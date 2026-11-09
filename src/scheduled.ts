import { and, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { createDb } from "@/db/index.js";
import { notifications } from "@/db/schemas/notifications.js";
import { tasks } from "@/db/schemas/tasks.js";
import { createNotification } from "@/lib/notifications.js";

/** Hourly cron: notify owners/assignees about tasks due within 24 hours. */
export async function handleScheduled(env: Env) {
	const { db } = createDb(env);
	const now = new Date();
	const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
	const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);

	const dueSoon = await db.query.tasks.findMany({
		where: and(
			isNull(tasks.archivedAt),
			sql`${tasks.status} != 'done'`,
			gte(tasks.dueDate, now),
			lte(tasks.dueDate, in24h),
		),
	});

	if (dueSoon.length === 0) {
		return;
	}

	const recipientIds = [
		...new Set(
			dueSoon.flatMap((task) =>
				task.assigneeId ? [task.userId, task.assigneeId] : [task.userId],
			),
		),
	];

	const recent = await db.query.notifications.findMany({
		where: and(
			inArray(notifications.userId, recipientIds),
			eq(notifications.type, "task_due_soon"),
			gte(notifications.createdAt, since),
		),
	});

	const alreadySent = new Set(
		recent.map((item) => `${item.userId}:${String(item.data?.taskId ?? "")}`),
	);

	for (const task of dueSoon) {
		const targets = new Set<string>([task.userId]);
		if (task.assigneeId) {
			targets.add(task.assigneeId);
		}

		for (const userId of targets) {
			const key = `${userId}:${task.id}`;
			if (alreadySent.has(key)) {
				continue;
			}

			await createNotification(db, env, {
				userId,
				type: "task_due_soon",
				title: `Due soon: ${task.name}`,
				body: `"${task.name}" is due within 24 hours.`,
				data: { taskId: task.id },
				sendEmail: true,
			});
			alreadySent.add(key);
		}
	}
}
