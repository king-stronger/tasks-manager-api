import { and, asc, count, eq, ilike } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";
import { createDb } from "@/db/index.js";
import { labels } from "@/db/schemas/labels.js";
import { getAuthenticatedUser } from "@/lib/get-user.js";
import { buildPaginatedResponse, getPagination } from "@/lib/pagination.js";
import type { AppRouteHandler } from "@/lib/types.js";
import type {
	CreateRoute,
	GetOneRoute,
	ListRoute,
	RemoveRoute,
	UpdateRoute,
} from "./labels.routes.js";

export const list: AppRouteHandler<ListRoute> = async (c) => {
	const user = getAuthenticatedUser(c);
	const { page, limit, q } = c.req.valid("query");
	const {
		offset,
		page: resolvedPage,
		limit: resolvedLimit,
	} = getPagination(page, limit);
	const { db } = createDb(c.env);

	const filters = [eq(labels.userId, user.id)];
	if (q) {
		filters.push(ilike(labels.name, `%${q}%`));
	}

	const whereClause = and(...filters);

	const [rows, totalRow] = await Promise.all([
		db.query.labels.findMany({
			where: whereClause,
			orderBy: [asc(labels.name)],
			limit: resolvedLimit,
			offset,
		}),
		db.select({ value: count() }).from(labels).where(whereClause),
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

export const create: AppRouteHandler<CreateRoute> = async (c) => {
	const user = getAuthenticatedUser(c);
	const payload = c.req.valid("json");
	const { db } = createDb(c.env);
	const [inserted] = await db
		.insert(labels)
		.values({
			...payload,
			userId: user.id,
		})
		.returning();

	return c.json(inserted, HttpStatusCodes.CREATED);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
	const user = getAuthenticatedUser(c);
	const { id } = c.req.valid("param");
	const { db } = createDb(c.env);
	const label = await db.query.labels.findFirst({
		where: and(eq(labels.id, id), eq(labels.userId, user.id)),
	});

	if (!label) {
		return c.json(
			{ message: HttpStatusPhrases.NOT_FOUND },
			HttpStatusCodes.NOT_FOUND,
		);
	}

	return c.json(label, HttpStatusCodes.OK);
};

export const update: AppRouteHandler<UpdateRoute> = async (c) => {
	const user = getAuthenticatedUser(c);
	const { id } = c.req.valid("param");
	const data = c.req.valid("json");
	const { db } = createDb(c.env);
	const [label] = await db
		.update(labels)
		.set(data)
		.where(and(eq(labels.id, id), eq(labels.userId, user.id)))
		.returning();

	if (!label) {
		return c.json(
			{ message: HttpStatusPhrases.NOT_FOUND },
			HttpStatusCodes.NOT_FOUND,
		);
	}

	return c.json(label, HttpStatusCodes.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
	const user = getAuthenticatedUser(c);
	const { id } = c.req.valid("param");
	const { db } = createDb(c.env);
	const result = await db
		.delete(labels)
		.where(and(eq(labels.id, id), eq(labels.userId, user.id)));

	if (result.rowCount === 0) {
		return c.json(
			{ message: HttpStatusPhrases.NOT_FOUND },
			HttpStatusCodes.NOT_FOUND,
		);
	}

	return c.body(null, HttpStatusCodes.NO_CONTENT);
};
