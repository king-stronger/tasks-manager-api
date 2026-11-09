import { z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import {
	jsonContent,
	jsonContentOneOf,
	jsonContentRequired,
} from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";
import {
	insertChecklistItemsSchema,
	selectChecklistItemsSchema,
	updateChecklistItemsSchema,
} from "@/db/schemas/checklist-items.js";
import { notFoundSchema } from "@/lib/constants.js";
import { TaskIdParamsSchema, TaskNestedIdParamsSchema } from "@/lib/params.js";
import { protectedRoute } from "@/middlewares/auth.js";

const tags = ["Checklist"];

export const list = protectedRoute({
	tags,
	method: "get",
	path: "/tasks/{taskId}/checklist",
	request: { params: TaskIdParamsSchema },
	responses: {
		[HttpStatusCodes.OK]: jsonContent(
			z.array(selectChecklistItemsSchema),
			"Checklist items for the task",
		),
		[HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "Task not found"),
	},
});

export const create = protectedRoute({
	tags,
	method: "post",
	path: "/tasks/{taskId}/checklist",
	request: {
		params: TaskIdParamsSchema,
		body: jsonContentRequired(
			insertChecklistItemsSchema,
			"Checklist item to create",
		),
	},
	responses: {
		[HttpStatusCodes.CREATED]: jsonContent(
			selectChecklistItemsSchema,
			"Created checklist item",
		),
		[HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "Task not found"),
		[HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
			createErrorSchema(insertChecklistItemsSchema),
			"Validation error(s)",
		),
	},
});

export const update = protectedRoute({
	tags,
	method: "patch",
	path: "/tasks/{taskId}/checklist/{id}",
	request: {
		params: TaskNestedIdParamsSchema,
		body: jsonContentRequired(
			updateChecklistItemsSchema,
			"Checklist item fields to update",
		),
	},
	responses: {
		[HttpStatusCodes.OK]: jsonContent(
			selectChecklistItemsSchema,
			"Updated checklist item",
		),
		[HttpStatusCodes.NOT_FOUND]: jsonContent(
			notFoundSchema,
			"Task or checklist item not found",
		),
		[HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContentOneOf(
			[
				createErrorSchema(updateChecklistItemsSchema),
				createErrorSchema(TaskNestedIdParamsSchema),
			],
			"Invalid id or validation error(s)",
		),
	},
});

export const remove = protectedRoute({
	tags,
	method: "delete",
	path: "/tasks/{taskId}/checklist/{id}",
	request: { params: TaskNestedIdParamsSchema },
	responses: {
		[HttpStatusCodes.NO_CONTENT]: {
			description: "Checklist item deleted",
		},
		[HttpStatusCodes.NOT_FOUND]: jsonContent(
			notFoundSchema,
			"Task or checklist item not found",
		),
	},
});

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type UpdateRoute = typeof update;
export type RemoveRoute = typeof remove;
