import { eq, inArray, like } from "drizzle-orm";
import { app } from "@/app.js";
import { createDb } from "@/db/index.js";
import { user } from "@/db/schemas/auth.js";
import { labels } from "@/db/schemas/labels.js";
import { notifications } from "@/db/schemas/notifications.js";
import { projects } from "@/db/schemas/projects.js";
import { taskLabels, tasks } from "@/db/schemas/tasks.js";
import { createAuth } from "@/lib/auth.js";
import { getTestEnv } from "./env.js";

/** Disposable emails for this repo's fixtures. */
export const TEST_EMAIL_DOMAIN = "tasks-manager.test";
/** Stable name/title prefix for projects, labels, and tasks. */
export const TEST_NAME_PREFIX = "[test-tm] ";

export function testEnv(overrides: Partial<Env> = {}) {
	return getTestEnv(overrides);
}

export function testDb(env: Env = testEnv()) {
	return createDb(env).db;
}

export async function api(
	path: string,
	init: RequestInit = {},
	env: Env = testEnv(),
) {
	const headers = new Headers(init.headers);
	if (
		init.body &&
		!headers.has("content-type") &&
		!(init.body instanceof FormData)
	) {
		headers.set("content-type", "application/json");
	}
	return app.request(
		path,
		{
			...init,
			headers,
		},
		env,
	);
}

function setCookiesFromResponse(response: Response) {
	const headersWithGetSetCookie = response.headers as Headers & {
		getSetCookie?: () => string[];
	};
	return (
		headersWithGetSetCookie.getSetCookie?.() ??
		(response.headers.get("set-cookie")
			? [response.headers.get("set-cookie") as string]
			: [])
	);
}

function cookiePair(setCookie: string) {
	return setCookie.split(";")[0] ?? setCookie;
}

function cookieFromAuthResponse(response: Response) {
	const sessionCookie = setCookiesFromResponse(response).find((value) =>
		value.startsWith("better-auth.session_token="),
	);
	if (!sessionCookie) {
		throw new Error("No better-auth.session_token cookie in auth response");
	}
	return cookiePair(sessionCookie);
}

export type TestUser = {
	id: string;
	email: string;
	name: string;
	cookie: string;
};

export async function createTestUser(input?: {
	email?: string;
	name?: string;
	password?: string;
}): Promise<TestUser> {
	const env = testEnv();
	const db = testDb(env);
	const auth = createAuth(env);
	const suffix = crypto.randomUUID().slice(0, 8);
	const email = input?.email ?? `user-${suffix}@${TEST_EMAIL_DOMAIN}`;
	const name = input?.name ?? `${TEST_NAME_PREFIX}User ${suffix}`;
	const password = input?.password ?? "test-password-123456";

	const response = await auth.api.signUpEmail({
		body: { email, password, name },
		asResponse: true,
	});

	if (!response.ok) {
		const body = await response.text();
		throw new Error(`signUpEmail failed (${response.status}): ${body}`);
	}

	const cookie = cookieFromAuthResponse(response);
	const created = await db.query.user.findFirst({
		where: eq(user.email, email),
	});
	if (!created) {
		throw new Error(`User not found after signup: ${email}`);
	}

	return {
		id: created.id,
		email,
		name,
		cookie,
	};
}

export async function seedTestProject(
	owner: TestUser,
	input?: { name?: string; description?: string | null },
) {
	const db = testDb();
	const suffix = crypto.randomUUID().slice(0, 8);
	const [project] = await db
		.insert(projects)
		.values({
			userId: owner.id,
			name: input?.name ?? `${TEST_NAME_PREFIX}Project ${suffix}`,
			description:
				input?.description === undefined
					? "Fixture project for tasks-manager-api tests"
					: input.description,
		})
		.returning();
	return project;
}

export async function seedTestLabel(
	owner: TestUser,
	input?: { name?: string; color?: string | null },
) {
	const db = testDb();
	const suffix = crypto.randomUUID().slice(0, 8);
	const [label] = await db
		.insert(labels)
		.values({
			userId: owner.id,
			name: input?.name ?? `${TEST_NAME_PREFIX}Label ${suffix}`,
			color: input?.color ?? "#2dd4bf",
		})
		.returning();
	return label;
}

export async function seedTestTask(
	owner: TestUser,
	input?: Partial<typeof tasks.$inferInsert> & { labelIds?: number[] },
) {
	const db = testDb();
	const suffix = crypto.randomUUID().slice(0, 8);
	const { labelIds, ...values } = input ?? {};
	const [task] = await db
		.insert(tasks)
		.values({
			userId: owner.id,
			name: values.name ?? `${TEST_NAME_PREFIX}Task ${suffix}`,
			description: values.description ?? "Fixture task",
			status: values.status ?? "todo",
			priority: values.priority ?? "medium",
			dueDate: values.dueDate,
			position: values.position ?? 0,
			projectId: values.projectId,
			assigneeId: values.assigneeId,
			recurrence: values.recurrence ?? "none",
			recurrenceInterval: values.recurrenceInterval ?? 1,
			recurrenceEndDate: values.recurrenceEndDate,
			archivedAt: values.archivedAt,
		})
		.returning();

	if (labelIds?.length) {
		await db.insert(taskLabels).values(
			labelIds.map((labelId) => ({
				taskId: task.id,
				labelId,
			})),
		);
	}

	return task;
}

export async function seedTestNotification(
	recipient: TestUser,
	input?: {
		type?: "task_assigned" | "task_due_soon" | "comment_added";
		title?: string;
		body?: string;
		data?: Record<string, unknown>;
		readAt?: Date | null;
	},
) {
	const db = testDb();
	const suffix = crypto.randomUUID().slice(0, 8);
	const [notification] = await db
		.insert(notifications)
		.values({
			userId: recipient.id,
			type: input?.type ?? "task_assigned",
			title: input?.title ?? `${TEST_NAME_PREFIX}Notification ${suffix}`,
			body: input?.body ?? "Fixture notification body",
			data: input?.data ?? {},
			readAt: input?.readAt === undefined ? null : input.readAt,
		})
		.returning();
	return notification;
}

/**
 * Idempotent cleanup for integration fixtures.
 * Prefer explicit ids; also sweeps leftover `@tasks-manager.test` users.
 */
export async function cleanupTestFixtures(input?: {
	userIds?: string[];
	taskIds?: number[];
	projectIds?: number[];
	labelIds?: number[];
}) {
	const db = testDb();
	const userIds = [...(input?.userIds ?? [])];

	if (input?.taskIds?.length) {
		await db.delete(tasks).where(inArray(tasks.id, input.taskIds));
	}
	if (input?.projectIds?.length) {
		await db.delete(projects).where(inArray(projects.id, input.projectIds));
	}
	if (input?.labelIds?.length) {
		await db.delete(labels).where(inArray(labels.id, input.labelIds));
	}

	const domainUsers = await db.query.user.findMany({
		where: like(user.email, `%@${TEST_EMAIL_DOMAIN}`),
		columns: { id: true },
	});
	for (const row of domainUsers) {
		if (!userIds.includes(row.id)) {
			userIds.push(row.id);
		}
	}

	if (userIds.length === 0) {
		return;
	}

	// Detach assignments owned by other users before cascading user deletes.
	await db
		.update(tasks)
		.set({ assigneeId: null })
		.where(inArray(tasks.assigneeId, userIds));
	await db.delete(user).where(inArray(user.id, userIds));
}
