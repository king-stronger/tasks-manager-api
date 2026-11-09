import { z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";
import {
	paginatedMetaSchema,
	paginationQuerySchema,
} from "@/lib/pagination.js";
import { protectedRoute } from "@/middlewares/auth.js";

const tags = ["Users"];

const userSummarySchema = z.object({
	id: z.string(),
	name: z.string(),
	email: z.string().email(),
	image: z.string().nullable(),
});

const listQuerySchema = paginationQuerySchema.extend({
	q: z.string().min(1).max(200).optional(),
});

const paginatedUsersSchema = z.object({
	data: z.array(userSummarySchema),
	meta: paginatedMetaSchema,
});

export const list = protectedRoute({
	tags,
	method: "get",
	path: "/users",
	request: {
		query: listQuerySchema,
	},
	responses: {
		[HttpStatusCodes.OK]: jsonContent(
			paginatedUsersSchema,
			"Paginated list of users",
		),
		[HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
			createErrorSchema(listQuerySchema),
			"The validation(s) error(s)",
		),
	},
});

export type ListRoute = typeof list;
