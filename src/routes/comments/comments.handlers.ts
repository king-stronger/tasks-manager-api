import { and, asc, count, desc, eq } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";
import { createDb } from "@/db/index.js";
import { comments } from "@/db/schemas/comments.js";
import { getAuthenticatedUser } from "@/lib/get-user.js";
import { createNotification } from "@/lib/notifications.js";
import { buildPaginatedResponse, getPagination } from "@/lib/pagination.js";
import { findAccessibleTask } from "@/lib/task-access.js";
import type { AppRouteHandler } from "@/lib/types.js";
import type {
	CreateRoute,
	ListRoute,
	RemoveRoute,
	UpdateRoute,
} from "./comments.routes.js";

const commentWithAuthor = {
	user: {
		columns: {
			id: true,
			name: true,
			image: true,
		},
	},
} as const;

function mapComment(
	comment: typeof comments.$inferSelect & {
		user?: { id: string; name: string; image: string | null };
	},
) {
	const { user, ...rest } = comment;
	return {
		...rest,
		author: user,
	};
}

export const list: AppRouteHandler<ListRoute> = async (c) => {
	const user = getAuthenticatedUser(c);
	const { taskId } = c.req.valid("param");
	const { page, limit } = c.req.valid("query");
	const {
		offset,
		page: resolvedPage,
		limit: resolvedLimit,
	} = getPagination(page, limit);
	const { db } = createDb(c.env);

	const task = await findAccessibleTask(db, taskId, user.id);
	if (!task) {
		return c.json(
			{ message: HttpStatusPhrases.NOT_FOUND },
			HttpStatusCodes.NOT_FOUND,
		);
	}

	const whereClause = eq(comments.taskId, taskId);
	const [rows, totalRow] = await Promise.all([
		db.query.comments.findMany({
			where: whereClause,
			with: commentWithAuthor,
			orderBy: [desc(comments.createdAt), asc(comments.id)],
			limit: resolvedLimit,
			offset,
		}),
		db.select({ value: count() }).from(comments).where(whereClause),
	]);

	return c.json(
		buildPaginatedResponse(
			rows.map(mapComment),
			totalRow[0]?.value ?? 0,
			resolvedPage,
			resolvedLimit,
		),
		HttpStatusCodes.OK,
	);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
	const user = getAuthenticatedUser(c);
	const { taskId } = c.req.valid("param");
	const payload = c.req.valid("json");
	const { db } = createDb(c.env);

	const task = await findAccessibleTask(db, taskId, user.id);
	if (!task) {
		return c.json(
			{ message: HttpStatusPhrases.NOT_FOUND },
			HttpStatusCodes.NOT_FOUND,
		);
	}

	const [inserted] = await db
		.insert(comments)
		.values({
			...payload,
			taskId,
			userId: user.id,
		})
		.returning();

	const notifyUserIds = new Set<string>();
	if (task.userId !== user.id) {
		notifyUserIds.add(task.userId);
	}
	if (task.assigneeId && task.assigneeId !== user.id) {
		notifyUserIds.add(task.assigneeId);
	}

	await Promise.all(
		[...notifyUserIds].map((userId) =>
			createNotification(db, c.env, {
				userId,
				type: "comment_added",
				title: `New comment on "${task.name}"`,
				body: `${user.name} commented: ${payload.body.slice(0, 180)}`,
				data: { taskId, commentId: inserted.id },
				sendEmail: true,
			}),
		),
	);

	const created = await db.query.comments.findFirst({
		where: eq(comments.id, inserted.id),
		with: commentWithAuthor,
	});

	if (!created) {
		return c.json(
			{ message: HttpStatusPhrases.NOT_FOUND },
			HttpStatusCodes.NOT_FOUND,
		);
	}

	return c.json(mapComment(created), HttpStatusCodes.CREATED);
};

export const update: AppRouteHandler<UpdateRoute> = async (c) => {
	const user = getAuthenticatedUser(c);
	const { taskId, id } = c.req.valid("param");
	const data = c.req.valid("json");
	const { db } = createDb(c.env);

	const task = await findAccessibleTask(db, taskId, user.id);
	if (!task) {
		return c.json(
			{ message: HttpStatusPhrases.NOT_FOUND },
			HttpStatusCodes.NOT_FOUND,
		);
	}

	const [updated] = await db
		.update(comments)
		.set(data)
		.where(
			and(
				eq(comments.id, id),
				eq(comments.taskId, taskId),
				eq(comments.userId, user.id),
			),
		)
		.returning();

	if (!updated) {
		return c.json(
			{ message: HttpStatusPhrases.NOT_FOUND },
			HttpStatusCodes.NOT_FOUND,
		);
	}

	const comment = await db.query.comments.findFirst({
		where: eq(comments.id, id),
		with: commentWithAuthor,
	});

	if (!comment) {
		return c.json(
			{ message: HttpStatusPhrases.NOT_FOUND },
			HttpStatusCodes.NOT_FOUND,
		);
	}

	return c.json(mapComment(comment), HttpStatusCodes.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
	const user = getAuthenticatedUser(c);
	const { taskId, id } = c.req.valid("param");
	const { db } = createDb(c.env);

	const task = await findAccessibleTask(db, taskId, user.id);
	if (!task) {
		return c.json(
			{ message: HttpStatusPhrases.NOT_FOUND },
			HttpStatusCodes.NOT_FOUND,
		);
	}

	const existing = await db.query.comments.findFirst({
		where: and(eq(comments.id, id), eq(comments.taskId, taskId)),
		columns: { id: true, userId: true },
	});

	if (!existing) {
		return c.json(
			{ message: HttpStatusPhrases.NOT_FOUND },
			HttpStatusCodes.NOT_FOUND,
		);
	}

	const canDelete = existing.userId === user.id || task.userId === user.id;
	if (!canDelete) {
		return c.json(
			{ message: HttpStatusPhrases.NOT_FOUND },
			HttpStatusCodes.NOT_FOUND,
		);
	}

	await db.delete(comments).where(eq(comments.id, id));
	return c.body(null, HttpStatusCodes.NO_CONTENT);
};
