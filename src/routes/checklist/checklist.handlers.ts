import { and, asc, eq } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";
import { createDb } from "@/db/index.js";
import { checklistItems } from "@/db/schemas/checklist-items.js";
import { getAuthenticatedUser } from "@/lib/get-user.js";
import { findAccessibleTask } from "@/lib/task-access.js";
import type { AppRouteHandler } from "@/lib/types.js";
import type {
	CreateRoute,
	ListRoute,
	RemoveRoute,
	UpdateRoute,
} from "./checklist.routes.js";

export const list: AppRouteHandler<ListRoute> = async (c) => {
	const user = getAuthenticatedUser(c);
	const { taskId } = c.req.valid("param");
	const { db } = createDb(c.env);

	const task = await findAccessibleTask(db, taskId, user.id);
	if (!task) {
		return c.json(
			{ message: HttpStatusPhrases.NOT_FOUND },
			HttpStatusCodes.NOT_FOUND,
		);
	}

	const items = await db.query.checklistItems.findMany({
		where: eq(checklistItems.taskId, taskId),
		orderBy: [asc(checklistItems.position), asc(checklistItems.id)],
	});

	return c.json(items, HttpStatusCodes.OK);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
	const user = getAuthenticatedUser(c);
	const { taskId } = c.req.valid("param");
	const payload = c.req.valid("json");
	const { db } = createDb(c.env);

	const task = await findAccessibleTask(db, taskId, user.id);
	if (!task) {
		return c.json(
			{ message: HttpStatusPhrases.NOT_FOUND },
			HttpStatusCodes.NOT_FOUND,
		);
	}

	const [inserted] = await db
		.insert(checklistItems)
		.values({ ...payload, taskId })
		.returning();

	return c.json(inserted, HttpStatusCodes.CREATED);
};

export const update: AppRouteHandler<UpdateRoute> = async (c) => {
	const user = getAuthenticatedUser(c);
	const { taskId, id } = c.req.valid("param");
	const data = c.req.valid("json");
	const { db } = createDb(c.env);

	const task = await findAccessibleTask(db, taskId, user.id);
	if (!task) {
		return c.json(
			{ message: HttpStatusPhrases.NOT_FOUND },
			HttpStatusCodes.NOT_FOUND,
		);
	}

	const [item] = await db
		.update(checklistItems)
		.set(data)
		.where(and(eq(checklistItems.id, id), eq(checklistItems.taskId, taskId)))
		.returning();

	if (!item) {
		return c.json(
			{ message: HttpStatusPhrases.NOT_FOUND },
			HttpStatusCodes.NOT_FOUND,
		);
	}

	return c.json(item, HttpStatusCodes.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
	const user = getAuthenticatedUser(c);
	const { taskId, id } = c.req.valid("param");
	const { db } = createDb(c.env);

	const task = await findAccessibleTask(db, taskId, user.id);
	if (!task) {
		return c.json(
			{ message: HttpStatusPhrases.NOT_FOUND },
			HttpStatusCodes.NOT_FOUND,
		);
	}

	const result = await db
		.delete(checklistItems)
		.where(and(eq(checklistItems.id, id), eq(checklistItems.taskId, taskId)));

	if (result.rowCount === 0) {
		return c.json(
			{ message: HttpStatusPhrases.NOT_FOUND },
			HttpStatusCodes.NOT_FOUND,
		);
	}

	return c.body(null, HttpStatusCodes.NO_CONTENT);
};
