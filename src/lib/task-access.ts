import { and, eq, or } from "drizzle-orm";
import type { createDb } from "@/db/index.js";
import { tasks } from "@/db/schemas/tasks.js";

type Db = ReturnType<typeof createDb>["db"];

export function taskVisibleToUser(userId: string) {
	return or(eq(tasks.userId, userId), eq(tasks.assigneeId, userId));
}

export async function findAccessibleTask(
	db: Db,
	taskId: number,
	userId: string,
) {
	return db.query.tasks.findFirst({
		where: and(eq(tasks.id, taskId), taskVisibleToUser(userId)),
	});
}

export async function assertUserExists(db: Db, userId: string) {
	const found = await db.query.user.findFirst({
		where: (users, { eq }) => eq(users.id, userId),
		columns: { id: true },
	});
	return Boolean(found);
}
