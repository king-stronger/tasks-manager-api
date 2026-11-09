import { z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import {
	jsonContent,
	jsonContentOneOf,
	jsonContentRequired,
} from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";
import {
	insertCommentsSchema,
	selectCommentsSchema,
	updateCommentsSchema,
} from "@/db/schemas/comments.js";
import { notFoundSchema } from "@/lib/constants.js";
import {
	paginatedMetaSchema,
	paginationQuerySchema,
} from "@/lib/pagination.js";
import { TaskIdParamsSchema, TaskNestedIdParamsSchema } from "@/lib/params.js";
import { protectedRoute } from "@/middlewares/auth.js";

const tags = ["Comments"];

const commentWithAuthorSchema = selectCommentsSchema.extend({
	author: z
		.object({
			id: z.string(),
			name: z.string(),
			image: z.string().nullable(),
		})
		.optional(),
});

export const list = protectedRoute({
	tags,
	method: "get",
	path: "/tasks/{taskId}/comments",
	request: {
		params: TaskIdParamsSchema,
		query: paginationQuerySchema,
	},
	responses: {
		[HttpStatusCodes.OK]: jsonContent(
			z.object({
				data: z.array(commentWithAuthorSchema),
				meta: paginatedMetaSchema,
			}),
			"Paginated comments",
		),
		[HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "Task not found"),
	},
});

export const create = protectedRoute({
	tags,
	method: "post",
	path: "/tasks/{taskId}/comments",
	request: {
		params: TaskIdParamsSchema,
		body: jsonContentRequired(insertCommentsSchema, "Comment to create"),
	},
	responses: {
		[HttpStatusCodes.CREATED]: jsonContent(
			commentWithAuthorSchema,
			"Created comment",
		),
		[HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "Task not found"),
		[HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
			createErrorSchema(insertCommentsSchema),
			"Validation error(s)",
		),
	},
});

export const update = protectedRoute({
	tags,
	method: "patch",
	path: "/tasks/{taskId}/comments/{id}",
	request: {
		params: TaskNestedIdParamsSchema,
		body: jsonContentRequired(updateCommentsSchema, "Comment fields to update"),
	},
	responses: {
		[HttpStatusCodes.OK]: jsonContent(
			commentWithAuthorSchema,
			"Updated comment",
		),
		[HttpStatusCodes.NOT_FOUND]: jsonContent(
			notFoundSchema,
			"Task or comment not found",
		),
		[HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContentOneOf(
			[
				createErrorSchema(updateCommentsSchema),
				createErrorSchema(TaskNestedIdParamsSchema),
			],
			"Invalid id or validation error(s)",
		),
	},
});

export const remove = protectedRoute({
	tags,
	method: "delete",
	path: "/tasks/{taskId}/comments/{id}",
	request: { params: TaskNestedIdParamsSchema },
	responses: {
		[HttpStatusCodes.NO_CONTENT]: { description: "Comment deleted" },
		[HttpStatusCodes.NOT_FOUND]: jsonContent(
			notFoundSchema,
			"Task or comment not found",
		),
	},
});

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type UpdateRoute = typeof update;
export type RemoveRoute = typeof remove;
