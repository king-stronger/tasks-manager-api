import { z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";
import { createErrorSchema, IdParamsSchema } from "stoker/openapi/schemas";
import { selectNotificationsSchema } from "@/db/schemas/notifications.js";
import { notFoundSchema } from "@/lib/constants.js";
import {
	paginatedMetaSchema,
	paginationQuerySchema,
} from "@/lib/pagination.js";
import { protectedRoute } from "@/middlewares/auth.js";

const tags = ["Notifications"];

const listQuerySchema = paginationQuerySchema.extend({
	unreadOnly: z
		.enum(["true", "false"])
		.default("false")
		.transform((value) => value === "true"),
});

export const list = protectedRoute({
	tags,
	method: "get",
	path: "/notifications",
	request: { query: listQuerySchema },
	responses: {
		[HttpStatusCodes.OK]: jsonContent(
			z.object({
				data: z.array(selectNotificationsSchema),
				meta: paginatedMetaSchema,
			}),
			"Paginated notifications",
		),
		[HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
			createErrorSchema(listQuerySchema),
			"Validation error(s)",
		),
	},
});

export const markRead = protectedRoute({
	tags,
	method: "post",
	path: "/notifications/{id}/read",
	request: { params: IdParamsSchema },
	responses: {
		[HttpStatusCodes.OK]: jsonContent(
			selectNotificationsSchema,
			"Notification marked as read",
		),
		[HttpStatusCodes.NOT_FOUND]: jsonContent(
			notFoundSchema,
			"Notification not found",
		),
	},
});

export const markAllRead = protectedRoute({
	tags,
	method: "post",
	path: "/notifications/read-all",
	responses: {
		[HttpStatusCodes.OK]: jsonContent(
			z.object({ updated: z.number().int() }),
			"All notifications marked as read",
		),
	},
});

export type ListRoute = typeof list;
export type MarkReadRoute = typeof markRead;
export type MarkAllReadRoute = typeof markAllRead;
