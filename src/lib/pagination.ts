import { z } from "@hono/zod-openapi";

export const paginationQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(1).optional(),
	limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
});

export const paginatedMetaSchema = z.object({
	page: z.number().int(),
	limit: z.number().int(),
	total: z.number().int(),
	totalPages: z.number().int(),
});

export function buildPaginatedResponse<T>(
	data: T[],
	total: number,
	page: number,
	limit: number,
) {
	return {
		data,
		meta: {
			page,
			limit,
			total,
			totalPages: Math.max(1, Math.ceil(total / limit)),
		},
	};
}

export function getPagination(page?: number, limit?: number) {
	const resolvedPage = page ?? 1;
	const resolvedLimit = limit ?? 20;
	return {
		page: resolvedPage,
		limit: resolvedLimit,
		offset: (resolvedPage - 1) * resolvedLimit,
	};
}
