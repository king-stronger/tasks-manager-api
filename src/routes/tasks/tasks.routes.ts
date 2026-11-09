import { z } from "@hono/zod-openapi";
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
	taskPrioritySchema,
	taskStatusSchema,
	updateTasksSchema,
} from "@/db/schemas/tasks.js";
import { notFoundSchema } from "@/lib/constants.js";
import {
	paginatedMetaSchema,
	paginationQuerySchema,
} from "@/lib/pagination.js";
import { protectedRoute } from "@/middlewares/auth.js";

const tags = ["Tasks"];

const selectTaskWithLabelsSchema = selectTasksSchema.extend({
	labels: z
		.array(
			z.object({
				id: z.number().int(),
				name: z.string(),
				color: z.string().nullable(),
			}),
		)
		.optional(),
});

const listQuerySchema = paginationQuerySchema.extend({
	status: taskStatusSchema.optional(),
	priority: taskPrioritySchema.optional(),
	projectId: z.coerce.number().int().positive().optional(),
	q: z.string().min(1).max(200).optional(),
	sortBy: z
		.enum(["createdAt", "updatedAt", "dueDate", "priority", "position", "name"])
		.default("position")
		.optional(),
	sortOrder: z.enum(["asc", "desc"]).default("asc").optional(),
	archived: z
		.enum(["true", "false"])
		.default("false")
		.transform((value) => value === "true"),
});

const paginatedTasksSchema = z.object({
	data: z.array(selectTaskWithLabelsSchema),
	meta: paginatedMetaSchema,
});

export const list = protectedRoute({
	tags,
	method: "get",
	path: "/tasks",
	request: {
		query: listQuerySchema,
	},
	responses: {
		[HttpStatusCodes.OK]: jsonContent(
			paginatedTasksSchema,
			"Paginated list of tasks",
		),
		[HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
			createErrorSchema(listQuerySchema),
			"The validation(s) error(s)",
		),
	},
});

export const create = protectedRoute({
	tags,
	path: "/tasks",
	method: "post",
	request: {
		body: jsonContentRequired(insertTasksSchema, "The task to create"),
	},
	responses: {
		[HttpStatusCodes.CREATED]: jsonContent(
			selectTaskWithLabelsSchema,
			"The created task",
		),
		[HttpStatusCodes.NOT_FOUND]: jsonContent(
			notFoundSchema,
			"Project or label not found",
		),
		[HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
			createErrorSchema(insertTasksSchema),
			"The validation(s) error(s)",
		),
	},
});

export const getOne = protectedRoute({
	tags,
	method: "get",
	path: "/tasks/{id}",
	request: {
		params: IdParamsSchema,
	},
	responses: {
		[HttpStatusCodes.OK]: jsonContent(
			selectTaskWithLabelsSchema,
			"The requested task",
		),
		[HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "Task not found"),
		[HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
			createErrorSchema(IdParamsSchema),
			"Invalid id error",
		),
	},
});

export const update = protectedRoute({
	tags,
	method: "patch",
	path: "/tasks/{id}",
	request: {
		params: IdParamsSchema,
		body: jsonContentRequired(updateTasksSchema, "The task fields to update"),
	},
	responses: {
		[HttpStatusCodes.OK]: jsonContent(
			selectTaskWithLabelsSchema,
			"The updated task",
		),
		[HttpStatusCodes.NOT_FOUND]: jsonContent(
			notFoundSchema,
			"Task, project or label not found",
		),
		[HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContentOneOf(
			[createErrorSchema(updateTasksSchema), createErrorSchema(IdParamsSchema)],
			"Invalid Id or Validation(s) error(s)",
		),
	},
});

export const remove = protectedRoute({
	tags,
	method: "delete",
	path: "/tasks/{id}",
	request: {
		params: IdParamsSchema,
		query: z.object({
			hard: z
				.enum(["true", "false"])
				.default("false")
				.transform((value) => value === "true"),
		}),
	},
	responses: {
		[HttpStatusCodes.NO_CONTENT]: {
			description: "The task was archived or deleted",
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
