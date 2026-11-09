import { and, asc, count, ilike, or } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { createDb } from "@/db/index.js";
import { user } from "@/db/schemas/auth.js";
import { getAuthenticatedUser } from "@/lib/get-user.js";
import { buildPaginatedResponse, getPagination } from "@/lib/pagination.js";
import type { AppRouteHandler } from "@/lib/types.js";
import type { ListRoute } from "./users.routes.js";

export const list: AppRouteHandler<ListRoute> = async (c) => {
	getAuthenticatedUser(c);
	const { page, limit, q } = c.req.valid("query");
	const {
		offset,
		page: resolvedPage,
		limit: resolvedLimit,
	} = getPagination(page, limit);
	const { db } = createDb(c.env);

	const filters = [];
	if (q) {
		const pattern = `%${q}%`;
		const searchFilter = or(
			ilike(user.name, pattern),
			ilike(user.email, pattern),
		);
		if (searchFilter) {
			filters.push(searchFilter);
		}
	}

	const whereClause = filters.length ? and(...filters) : undefined;

	const [rows, totalRow] = await Promise.all([
		db
			.select({
				id: user.id,
				name: user.name,
				email: user.email,
				image: user.image,
			})
			.from(user)
			.where(whereClause)
			.orderBy(asc(user.name))
			.limit(resolvedLimit)
			.offset(offset),
		db.select({ value: count() }).from(user).where(whereClause),
	]);

	return c.json(
		buildPaginatedResponse(
			rows.map((row) => ({
				...row,
				image: row.image ?? null,
			})),
			totalRow[0]?.value ?? 0,
			resolvedPage,
			resolvedLimit,
		),
		HttpStatusCodes.OK,
	);
};
