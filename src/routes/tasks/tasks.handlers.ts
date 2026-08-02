import { eq } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";
import db from "@/db/index.js";
import { tasks } from "@/db/schema.js";
import type { AppRouteHandler } from "@/lib/types.js";
import type {
	CreateRoute,
	GetOneRoute,
	ListRoute,
	RemoveRoute,
	UpdateRoute,
} from "./tasks.routes.js";

export const list: AppRouteHandler<ListRoute> = async (c) => {
	const tasks = await db.query.tasks.findMany();
	return c.json(tasks);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
	const task = c.req.valid("json");
	const [inserted] = await db.insert(tasks).values(task).returning();

	return c.json(inserted, HttpStatusCodes.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
	const { id } = c.req.valid("param");
	const task = await db.query.tasks.findFirst({
		where: (tasks, { eq }) => eq(tasks.id, id),
	});

	if (!task) {
		return c.json(
			{
				message: HttpStatusPhrases.NOT_FOUND,
			},
			HttpStatusCodes.NOT_FOUND,
		);
	}
	return c.json(task, HttpStatusCodes.OK);
};

export const update: AppRouteHandler<UpdateRoute> = async (c) => {
	const { id } = c.req.valid("param");
	const data = c.req.valid("json");

	const [task] = await db
		.update(tasks)
		.set(data)
		.where(eq(tasks.id, id))
		.returning();

	if (!task) {
		return c.json(
			{
				message: HttpStatusPhrases.NOT_FOUND,
			},
			HttpStatusCodes.NOT_FOUND,
		);
	}
	return c.json(task, HttpStatusCodes.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
	const { id } = c.req.valid("param");

	const result = await db.delete(tasks).where(eq(tasks.id, id));

	if (result.rowsAffected === 0) {
		return c.json(
			{
				message: HttpStatusPhrases.NOT_FOUND,
			},
			HttpStatusCodes.NOT_FOUND,
		);
	}
	return c.body(null, HttpStatusCodes.NO_CONTENT);
};
