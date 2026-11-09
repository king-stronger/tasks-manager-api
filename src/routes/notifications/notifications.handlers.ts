import { and, count, desc, eq, isNull, sql } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";
import { createDb } from "@/db/index.js";
import { notifications } from "@/db/schemas/notifications.js";
import { getAuthenticatedUser } from "@/lib/get-user.js";
import { buildPaginatedResponse, getPagination } from "@/lib/pagination.js";
import type { AppRouteHandler } from "@/lib/types.js";
import type {
	ListRoute,
	MarkAllReadRoute,
	MarkReadRoute,
} from "./notifications.routes.js";

export const list: AppRouteHandler<ListRoute> = async (c) => {
	const user = getAuthenticatedUser(c);
	const { page, limit, unreadOnly = false } = c.req.valid("query");
	const {
		offset,
		page: resolvedPage,
		limit: resolvedLimit,
	} = getPagination(page, limit);
	const { db } = createDb(c.env);

	const filters = [eq(notifications.userId, user.id)];
	if (unreadOnly) {
		filters.push(isNull(notifications.readAt));
	}
	const whereClause = and(...filters);

	const [rows, totalRow] = await Promise.all([
		db.query.notifications.findMany({
			where: whereClause,
			orderBy: [desc(notifications.createdAt)],
			limit: resolvedLimit,
			offset,
		}),
		db.select({ value: count() }).from(notifications).where(whereClause),
	]);

	return c.json(
		buildPaginatedResponse(
			rows,
			totalRow[0]?.value ?? 0,
			resolvedPage,
			resolvedLimit,
		),
		HttpStatusCodes.OK,
	);
};

export const markRead: AppRouteHandler<MarkReadRoute> = async (c) => {
	const user = getAuthenticatedUser(c);
	const { id } = c.req.valid("param");
	const { db } = createDb(c.env);

	const [updated] = await db
		.update(notifications)
		.set({ readAt: sql`now()` })
		.where(and(eq(notifications.id, id), eq(notifications.userId, user.id)))
		.returning();

	if (!updated) {
		return c.json(
			{ message: HttpStatusPhrases.NOT_FOUND },
			HttpStatusCodes.NOT_FOUND,
		);
	}

	return c.json(updated, HttpStatusCodes.OK);
};

export const markAllRead: AppRouteHandler<MarkAllReadRoute> = async (c) => {
	const user = getAuthenticatedUser(c);
	const { db } = createDb(c.env);

	const updated = await db
		.update(notifications)
		.set({ readAt: sql`now()` })
		.where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)))
		.returning({ id: notifications.id });

	return c.json({ updated: updated.length }, HttpStatusCodes.OK);
};
