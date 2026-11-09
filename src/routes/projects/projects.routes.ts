import { z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import {
	jsonContent,
	jsonContentOneOf,
	jsonContentRequired,
} from "stoker/openapi/helpers";
import { createErrorSchema, IdParamsSchema } from "stoker/openapi/schemas";
import {
	insertProjectsSchema,
	selectProjectsSchema,
	updateProjectsSchema,
} from "@/db/schemas/projects.js";
import { notFoundSchema } from "@/lib/constants.js";
import {
	paginatedMetaSchema,
	paginationQuerySchema,
} from "@/lib/pagination.js";
import { protectedRoute } from "@/middlewares/auth.js";

const tags = ["Projects"];

const listQuerySchema = paginationQuerySchema.extend({
	q: z.string().min(1).max(200).optional(),
	sortBy: z
		.enum(["createdAt", "updatedAt", "position", "name"])
		.default("position")
		.optional(),
	sortOrder: z.enum(["asc", "desc"]).default("asc").optional(),
	archived: z
		.enum(["true", "false"])
		.default("false")
		.transform((value) => value === "true"),
});

const paginatedProjectsSchema = z.object({
	data: z.array(selectProjectsSchema),
	meta: paginatedMetaSchema,
});

export const list = protectedRoute({
	tags,
	method: "get",
	path: "/projects",
	request: {
		query: listQuerySchema,
	},
	responses: {
		[HttpStatusCodes.OK]: jsonContent(
			paginatedProjectsSchema,
			"Paginated list of projects",
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
	path: "/projects",
	request: {
		body: jsonContentRequired(insertProjectsSchema, "The project to create"),
	},
	responses: {
		[HttpStatusCodes.CREATED]: jsonContent(
			selectProjectsSchema,
			"The created project",
		),
		[HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
			createErrorSchema(insertProjectsSchema),
			"The validation(s) error(s)",
		),
	},
});

export const getOne = protectedRoute({
	tags,
	method: "get",
	path: "/projects/{id}",
	request: {
		params: IdParamsSchema,
	},
	responses: {
		[HttpStatusCodes.OK]: jsonContent(
			selectProjectsSchema,
			"The requested project",
		),
		[HttpStatusCodes.NOT_FOUND]: jsonContent(
			notFoundSchema,
			"Project not found",
		),
		[HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
			createErrorSchema(IdParamsSchema),
			"Invalid id error",
		),
	},
});

export const update = protectedRoute({
	tags,
	method: "patch",
	path: "/projects/{id}",
	request: {
		params: IdParamsSchema,
		body: jsonContentRequired(
			updateProjectsSchema,
			"The project fields to update",
		),
	},
	responses: {
		[HttpStatusCodes.OK]: jsonContent(
			selectProjectsSchema,
			"The updated project",
		),
		[HttpStatusCodes.NOT_FOUND]: jsonContent(
			notFoundSchema,
			"Project not found",
		),
		[HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContentOneOf(
			[
				createErrorSchema(updateProjectsSchema),
				createErrorSchema(IdParamsSchema),
			],
			"Invalid Id or Validation(s) error(s)",
		),
	},
});

export const remove = protectedRoute({
	tags,
	method: "delete",
	path: "/projects/{id}",
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
			description: "The project was archived or deleted",
		},
		[HttpStatusCodes.NOT_FOUND]: jsonContent(
			notFoundSchema,
			"Project not found",
		),
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
