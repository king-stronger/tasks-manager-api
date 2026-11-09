import { and, eq, inArray } from "drizzle-orm";
import type { createDb } from "../db/index.js";
import { labels } from "../db/schemas/labels.js";
import { projects } from "../db/schemas/projects.js";

type Db = ReturnType<typeof createDb>["db"];

export async function assertProjectOwnedByUser(
	db: Db,
	projectId: number,
	userId: string,
) {
	const project = await db.query.projects.findFirst({
		where: and(eq(projects.id, projectId), eq(projects.userId, userId)),
		columns: { id: true },
	});
	return Boolean(project);
}

export async function assertLabelsOwnedByUser(
	db: Db,
	labelIds: number[],
	userId: string,
) {
	if (labelIds.length === 0) {
		return true;
	}

	const owned = await db.query.labels.findMany({
		where: and(eq(labels.userId, userId), inArray(labels.id, labelIds)),
		columns: { id: true },
	});

	return owned.length === labelIds.length;
}
