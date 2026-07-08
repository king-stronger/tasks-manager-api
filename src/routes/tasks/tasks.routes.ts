import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema, IdParamsSchema } from "stoker/openapi/schemas";
import { insertTasksSchema, selectTasksSchema } from "@/db/schema.js";
import { notFoundSchema } from "@/lib/constants.js";

const tags = ["Tasks"];

export const list = createRoute({
	tags,
	method: "get",
	path: "/tasks",
	responses: {
		[HttpStatusCodes.OK]: jsonContent(
			z.array(selectTasksSchema),
			"The list of tasks",
		),
	},
});

export const create = createRoute({
	tags,
	path: "/tasks",
	method: "post",
	request: {
		body: jsonContentRequired(
			insertTasksSchema,
			"The task to create",
		),
	},
	responses: {
		[HttpStatusCodes.OK]: jsonContent(
			selectTasksSchema,
			"The created task",
		),
		[HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
			createErrorSchema(insertTasksSchema),
			"The validation(s) error(s)",
		),
	},
});

export const getOne = createRoute({
	tags,
	method: "get",
	path: "/tasks/{id}",
	request: {
		params: IdParamsSchema,
	},
	responses: {
		[HttpStatusCodes.OK]: jsonContent(
			selectTasksSchema,
			"The requested task",
		),
		[HttpStatusCodes.NOT_FOUND]: jsonContent(
			notFoundSchema,
			"Task not found",
		),
		[HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
			createErrorSchema(IdParamsSchema),
			"Invalid id error",
		),
	},
});

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
