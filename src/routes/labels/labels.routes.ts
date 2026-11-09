import { z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import {
	jsonContent,
	jsonContentOneOf,
	jsonContentRequired,
} from "stoker/openapi/helpers";
import { createErrorSchema, IdParamsSchema } from "stoker/openapi/schemas";
import {
	insertLabelsSchema,
	selectLabelsSchema,
	updateLabelsSchema,
} from "@/db/schemas/labels.js";
import { notFoundSchema } from "@/lib/constants.js";
import {
	paginatedMetaSchema,
	paginationQuerySchema,
} from "@/lib/pagination.js";
import { protectedRoute } from "@/middlewares/auth.js";

const tags = ["Labels"];

const listQuerySchema = paginationQuerySchema.extend({
	q: z.string().min(1).max(200).optional(),
});

const paginatedLabelsSchema = z.object({
	data: z.array(selectLabelsSchema),
	meta: paginatedMetaSchema,
});

export const list = protectedRoute({
	tags,
	method: "get",
	path: "/labels",
	request: {
		query: listQuerySchema,
	},
	responses: {
		[HttpStatusCodes.OK]: jsonContent(
			paginatedLabelsSchema,
			"Paginated list of labels",
		),
		[HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
			createErrorSchema(listQuerySchema),
			"The validation(s) error(s)",
		),
	},
});

export const create = protectedRoute({
	tags,
	method: "post",
	path: "/labels",
	request: {
		body: jsonContentRequired(insertLabelsSchema, "The label to create"),
	},
	responses: {
		[HttpStatusCodes.CREATED]: jsonContent(
			selectLabelsSchema,
			"The created label",
		),
		[HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
			createErrorSchema(insertLabelsSchema),
			"The validation(s) error(s)",
		),
	},
});

export const getOne = protectedRoute({
	tags,
	method: "get",
	path: "/labels/{id}",
	request: {
		params: IdParamsSchema,
	},
	responses: {
		[HttpStatusCodes.OK]: jsonContent(
			selectLabelsSchema,
			"The requested label",
		),
		[HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "Label not found"),
		[HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
			createErrorSchema(IdParamsSchema),
			"Invalid id error",
		),
	},
});

export const update = protectedRoute({
	tags,
	method: "patch",
	path: "/labels/{id}",
	request: {
		params: IdParamsSchema,
		body: jsonContentRequired(updateLabelsSchema, "The label fields to update"),
	},
	responses: {
		[HttpStatusCodes.OK]: jsonContent(selectLabelsSchema, "The updated label"),
		[HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "Label not found"),
		[HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContentOneOf(
			[
				createErrorSchema(updateLabelsSchema),
				createErrorSchema(IdParamsSchema),
			],
			"Invalid Id or Validation(s) error(s)",
		),
	},
});

export const remove = protectedRoute({
	tags,
	method: "delete",
	path: "/labels/{id}",
	request: {
		params: IdParamsSchema,
	},
	responses: {
		[HttpStatusCodes.NO_CONTENT]: {
			description: "The label was deleted",
		},
		[HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "Label not found"),
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
