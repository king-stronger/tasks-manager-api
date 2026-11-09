import {
	and,
	asc,
	count,
	desc,
	eq,
	ilike,
	isNotNull,
	isNull,
	sql,
} from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";
import { createDb } from "@/db/index.js";
import { projects } from "@/db/schemas/projects.js";
import { getAuthenticatedUser } from "@/lib/get-user.js";
import { buildPaginatedResponse, getPagination } from "@/lib/pagination.js";
import type { AppRouteHandler } from "@/lib/types.js";
import type {
	CreateRoute,
	GetOneRoute,
	ListRoute,
	RemoveRoute,
	UpdateRoute,
} from "./projects.routes.js";

export const list: AppRouteHandler<ListRoute> = async (c) => {
	const user = getAuthenticatedUser(c);
	const {
		page,
		limit,
		q,
		sortBy = "position",
		sortOrder = "asc",
		archived = false,
	} = c.req.valid("query");
	const {
		offset,
		page: resolvedPage,
		limit: resolvedLimit,
	} = getPagination(page, limit);
	const { db } = createDb(c.env);

	const filters = [
		eq(projects.userId, user.id),
		archived ? isNotNull(projects.archivedAt) : isNull(projects.archivedAt),
	];

	if (q) {
		filters.push(ilike(projects.name, `%${q}%`));
	}

	const whereClause = and(...filters);
	const orderExpression = {
		createdAt: projects.createdAt,
		updatedAt: projects.updatedAt,
		position: projects.position,
		name: projects.name,
	}[sortBy];
	const orderBy =
		sortOrder === "desc" ? desc(orderExpression) : asc(orderExpression);

	const [rows, totalRow] = await Promise.all([
		db.query.projects.findMany({
			where: whereClause,
			orderBy: [orderBy],
			limit: resolvedLimit,
			offset,
		}),
		db.select({ value: count() }).from(projects).where(whereClause),
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
		.insert(projects)
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
	const project = await db.query.projects.findFirst({
		where: and(eq(projects.id, id), eq(projects.userId, user.id)),
	});

	if (!project) {
		return c.json(
			{ message: HttpStatusPhrases.NOT_FOUND },
			HttpStatusCodes.NOT_FOUND,
		);
	}

	return c.json(project, HttpStatusCodes.OK);
};

export const update: AppRouteHandler<UpdateRoute> = async (c) => {
	const user = getAuthenticatedUser(c);
	const { id } = c.req.valid("param");
	const data = c.req.valid("json");
	const { db } = createDb(c.env);
	const [project] = await db
		.update(projects)
		.set(data)
		.where(and(eq(projects.id, id), eq(projects.userId, user.id)))
		.returning();

	if (!project) {
		return c.json(
			{ message: HttpStatusPhrases.NOT_FOUND },
			HttpStatusCodes.NOT_FOUND,
		);
	}

	return c.json(project, HttpStatusCodes.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
	const user = getAuthenticatedUser(c);
	const { id } = c.req.valid("param");
	const { hard = false } = c.req.valid("query");
	const { db } = createDb(c.env);
	const ownership = and(eq(projects.id, id), eq(projects.userId, user.id));

	if (hard) {
		const result = await db.delete(projects).where(ownership);
		if (result.rowCount === 0) {
			return c.json(
				{ message: HttpStatusPhrases.NOT_FOUND },
				HttpStatusCodes.NOT_FOUND,
			);
		}
	} else {
		const [archived] = await db
			.update(projects)
			.set({ archivedAt: sql`now()` })
			.where(and(ownership, isNull(projects.archivedAt)))
			.returning({ id: projects.id });

		if (!archived) {
			const exists = await db.query.projects.findFirst({
				where: ownership,
				columns: { id: true },
			});
			if (!exists) {
				return c.json(
					{ message: HttpStatusPhrases.NOT_FOUND },
					HttpStatusCodes.NOT_FOUND,
				);
			}
		}
	}

	return c.body(null, HttpStatusCodes.NO_CONTENT);
};
