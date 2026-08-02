import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import {
	jsonContent,
	jsonContentOneOf,
	jsonContentRequired,
} from "stoker/openapi/helpers";
import { createErrorSchema, IdParamsSchema } from "stoker/openapi/schemas";
import {
	insertTasksSchema,
	selectTasksSchema,
	updateTasksSchema,
} from "@/db/schema.js";
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
		body: jsonContentRequired(insertTasksSchema, "The task to create"),
	},
	responses: {
		[HttpStatusCodes.OK]: jsonContent(selectTasksSchema, "The created task"),
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
		[HttpStatusCodes.OK]: jsonContent(selectTasksSchema, "The requested task"),
		[HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "Task not found"),
		[HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
			createErrorSchema(IdParamsSchema),
			"Invalid id error",
		),
	},
});

export const update = createRoute({
	tags,
	method: "put",
	path: "/tasks/{id}",
	request: {
		params: IdParamsSchema,
		body: jsonContentRequired(updateTasksSchema, "The task to update"),
	},
	responses: {
		[HttpStatusCodes.OK]: jsonContent(selectTasksSchema, "The updated task"),
		[HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "Task not found"),
		[HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContentOneOf(
			[createErrorSchema(updateTasksSchema), createErrorSchema(IdParamsSchema)],
			"Invalid Id or Validation(s) error(s)",
		),
	},
});

export const remove = createRoute({
	tags,
	method: "delete",
	path: "/tasks/{id}",
	request: {
		params: IdParamsSchema,
	},
	responses: {
		[HttpStatusCodes.NO_CONTENT]: {
			description: "The deleted task",
		},
		[HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "Task not found"),
		[HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
			createErrorSchema(IdParamsSchema),
			"Invalid id",
		),
	},
});

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type UpdateRoute = typeof update;
export type RemoveRoute = typeof remove;
