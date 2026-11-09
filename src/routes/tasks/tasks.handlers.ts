import {
	and,
	asc,
	count,
	desc,
	eq,
	ilike,
	isNotNull,
	isNull,
	or,
	sql,
} from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";
import { createDb } from "@/db/index.js";
import { taskLabels, tasks } from "@/db/schemas/tasks.js";
import { getAuthenticatedUser } from "@/lib/get-user.js";
import {
	assertLabelsOwnedByUser,
	assertProjectOwnedByUser,
} from "@/lib/ownership.js";
import { buildPaginatedResponse, getPagination } from "@/lib/pagination.js";
import type { AppRouteHandler } from "@/lib/types.js";
import type {
	CreateRoute,
	GetOneRoute,
	ListRoute,
	RemoveRoute,
	UpdateRoute,
} from "./tasks.routes.js";

function mapTaskWithLabels(
	task: typeof tasks.$inferSelect & {
		taskLabels?: Array<{
			label: { id: number; name: string; color: string | null };
		}>;
	},
) {
	const { taskLabels: joinedLabels, ...rest } = task;
	return {
		...rest,
		labels: joinedLabels?.map((entry) => entry.label) ?? [],
	};
}

const taskWithLabels = {
	taskLabels: {
		with: {
			label: {
				columns: {
					id: true,
					name: true,
					color: true,
				},
			},
		},
	},
} as const;

async function syncTaskLabels(
	db: ReturnType<typeof createDb>["db"],
	taskId: number,
	labelIds: number[],
) {
	await db.delete(taskLabels).where(eq(taskLabels.taskId, taskId));
	if (labelIds.length === 0) {
		return;
	}
	await db.insert(taskLabels).values(
		labelIds.map((labelId) => ({
			taskId,
			labelId,
		})),
	);
}

export const list: AppRouteHandler<ListRoute> = async (c) => {
	const user = getAuthenticatedUser(c);
	const {
		page,
		limit,
		status,
		priority,
		projectId,
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
		eq(tasks.userId, user.id),
		archived ? isNotNull(tasks.archivedAt) : isNull(tasks.archivedAt),
	];

	if (status) {
		filters.push(eq(tasks.status, status));
	}
	if (priority) {
		filters.push(eq(tasks.priority, priority));
	}
	if (projectId) {
		filters.push(eq(tasks.projectId, projectId));
	}
	if (q) {
		const pattern = `%${q}%`;
		const searchFilter = or(
			ilike(tasks.name, pattern),
			ilike(tasks.description, pattern),
		);
		if (searchFilter) {
			filters.push(searchFilter);
		}
	}

	const whereClause = and(...filters);
	const orderExpression = {
		createdAt: tasks.createdAt,
		updatedAt: tasks.updatedAt,
		dueDate: tasks.dueDate,
		priority: tasks.priority,
		position: tasks.position,
		name: tasks.name,
	}[sortBy];
	const orderBy =
		sortOrder === "desc" ? desc(orderExpression) : asc(orderExpression);

	const [rows, totalRow] = await Promise.all([
		db.query.tasks.findMany({
			where: whereClause,
			with: taskWithLabels,
			orderBy: [orderBy],
			limit: resolvedLimit,
			offset,
		}),
		db.select({ value: count() }).from(tasks).where(whereClause),
	]);

	return c.json(
		buildPaginatedResponse(
			rows.map(mapTaskWithLabels),
			totalRow[0]?.value ?? 0,
			resolvedPage,
			resolvedLimit,
		),
		HttpStatusCodes.OK,
	);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
	const user = getAuthenticatedUser(c);
	const { labelIds, ...payload } = c.req.valid("json");
	const { db } = createDb(c.env);

	if (payload.projectId != null) {
		const owned = await assertProjectOwnedByUser(
			db,
			payload.projectId,
			user.id,
		);
		if (!owned) {
			return c.json(
				{ message: HttpStatusPhrases.NOT_FOUND },
				HttpStatusCodes.NOT_FOUND,
			);
		}
	}

	if (labelIds?.length) {
		const owned = await assertLabelsOwnedByUser(db, labelIds, user.id);
		if (!owned) {
			return c.json(
				{ message: HttpStatusPhrases.NOT_FOUND },
				HttpStatusCodes.NOT_FOUND,
			);
		}
	}

	const [inserted] = await db
		.insert(tasks)
		.values({
			...payload,
			userId: user.id,
		})
		.returning();

	if (labelIds) {
		await syncTaskLabels(db, inserted.id, labelIds);
	}

	const created = await db.query.tasks.findFirst({
		where: and(eq(tasks.id, inserted.id), eq(tasks.userId, user.id)),
		with: taskWithLabels,
	});

	if (!created) {
		return c.json(
			{ message: HttpStatusPhrases.NOT_FOUND },
			HttpStatusCodes.NOT_FOUND,
		);
	}

	return c.json(mapTaskWithLabels(created), HttpStatusCodes.CREATED);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
	const user = getAuthenticatedUser(c);
	const { id } = c.req.valid("param");
	const { db } = createDb(c.env);
	const task = await db.query.tasks.findFirst({
		where: and(eq(tasks.id, id), eq(tasks.userId, user.id)),
		with: taskWithLabels,
	});

	if (!task) {
		return c.json(
			{ message: HttpStatusPhrases.NOT_FOUND },
			HttpStatusCodes.NOT_FOUND,
		);
	}

	return c.json(mapTaskWithLabels(task), HttpStatusCodes.OK);
};

export const update: AppRouteHandler<UpdateRoute> = async (c) => {
	const user = getAuthenticatedUser(c);
	const { id } = c.req.valid("param");
	const { labelIds, ...data } = c.req.valid("json");
	const { db } = createDb(c.env);

	const existing = await db.query.tasks.findFirst({
		where: and(eq(tasks.id, id), eq(tasks.userId, user.id)),
		columns: { id: true },
	});

	if (!existing) {
		return c.json(
			{ message: HttpStatusPhrases.NOT_FOUND },
			HttpStatusCodes.NOT_FOUND,
		);
	}

	if (data.projectId != null) {
		const owned = await assertProjectOwnedByUser(db, data.projectId, user.id);
		if (!owned) {
			return c.json(
				{ message: HttpStatusPhrases.NOT_FOUND },
				HttpStatusCodes.NOT_FOUND,
			);
		}
	}

	if (labelIds) {
		const owned = await assertLabelsOwnedByUser(db, labelIds, user.id);
		if (!owned) {
			return c.json(
				{ message: HttpStatusPhrases.NOT_FOUND },
				HttpStatusCodes.NOT_FOUND,
			);
		}
	}

	if (Object.keys(data).length > 0) {
		await db
			.update(tasks)
			.set(data)
			.where(and(eq(tasks.id, id), eq(tasks.userId, user.id)));
	}

	if (labelIds) {
		await syncTaskLabels(db, id, labelIds);
	}

	const task = await db.query.tasks.findFirst({
		where: and(eq(tasks.id, id), eq(tasks.userId, user.id)),
		with: taskWithLabels,
	});

	if (!task) {
		return c.json(
			{ message: HttpStatusPhrases.NOT_FOUND },
			HttpStatusCodes.NOT_FOUND,
		);
	}

	return c.json(mapTaskWithLabels(task), HttpStatusCodes.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
	const user = getAuthenticatedUser(c);
	const { id } = c.req.valid("param");
	const { hard = false } = c.req.valid("query");
	const { db } = createDb(c.env);
	const ownership = and(eq(tasks.id, id), eq(tasks.userId, user.id));

	if (hard) {
		const result = await db.delete(tasks).where(ownership);
		if (result.rowCount === 0) {
			return c.json(
				{ message: HttpStatusPhrases.NOT_FOUND },
				HttpStatusCodes.NOT_FOUND,
			);
		}
	} else {
		const [archived] = await db
			.update(tasks)
			.set({ archivedAt: sql`now()` })
			.where(and(ownership, isNull(tasks.archivedAt)))
			.returning({ id: tasks.id });

		if (!archived) {
			const exists = await db.query.tasks.findFirst({
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
