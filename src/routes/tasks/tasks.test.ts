import { and, eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { notifications } from "@/db/schemas/notifications.js";
import { tasks } from "@/db/schemas/tasks.js";
import {
	TEST_NAME_PREFIX,
	api,
	cleanupTestFixtures,
	createTestUser,
	seedTestProject,
	seedTestTask,
	testDb,
} from "@/test/helpers.js";

describe("tasks", () => {
	const fixtures: { userIds: string[] } = { userIds: [] };

	afterEach(async () => {
		await cleanupTestFixtures({ userIds: fixtures.userIds });
		fixtures.userIds = [];
	});

	it("rejects unauthenticated task access", async () => {
		const res = await api("/tasks");
		expect(res.status).toBe(401);
	});

	it("creates, lists, and fetches an owned task", async () => {
		const owner = await createTestUser();
		fixtures.userIds.push(owner.id);
		const project = await seedTestProject(owner);

		const created = await api("/tasks", {
			method: "POST",
			headers: { cookie: owner.cookie },
			body: JSON.stringify({
				name: `${TEST_NAME_PREFIX}Create me`,
				description: "Integration create",
				status: "todo",
				priority: "high",
				projectId: project.id,
			}),
		});
		expect(created.status).toBe(201);
		const createdBody = (await created.json()) as {
			id: number;
			name: string;
			projectId: number | null;
			userId: string;
		};
		expect(createdBody.name).toBe(`${TEST_NAME_PREFIX}Create me`);
		expect(createdBody.projectId).toBe(project.id);
		expect(createdBody.userId).toBe(owner.id);

		const listed = await api("/tasks?q=Create%20me", {
			headers: { cookie: owner.cookie },
		});
		expect(listed.status).toBe(200);
		const listBody = (await listed.json()) as {
			data: Array<{ id: number }>;
			meta: { total: number };
		};
		expect(listBody.data.some((task) => task.id === createdBody.id)).toBe(true);
		expect(listBody.meta.total).toBeGreaterThanOrEqual(1);

		const one = await api(`/tasks/${createdBody.id}`, {
			headers: { cookie: owner.cookie },
		});
		expect(one.status).toBe(200);
		const oneBody = (await one.json()) as { id: number; priority: string };
		expect(oneBody.id).toBe(createdBody.id);
		expect(oneBody.priority).toBe("high");

		const db = testDb();
		const row = await db.query.tasks.findFirst({
			where: eq(tasks.id, createdBody.id),
		});
		expect(row?.name).toBe(`${TEST_NAME_PREFIX}Create me`);
	});

	it("lets an assignee see the task and update status only", async () => {
		const owner = await createTestUser();
		const assignee = await createTestUser();
		fixtures.userIds.push(owner.id, assignee.id);

		const task = await seedTestTask(owner, {
			name: `${TEST_NAME_PREFIX}Assigned`,
			assigneeId: assignee.id,
		});

		const asAssignee = await api(`/tasks/${task.id}`, {
			headers: { cookie: assignee.cookie },
		});
		expect(asAssignee.status).toBe(200);

		const statusPatch = await api(`/tasks/${task.id}`, {
			method: "PATCH",
			headers: { cookie: assignee.cookie },
			body: JSON.stringify({ status: "in_progress" }),
		});
		expect(statusPatch.status).toBe(200);
		const statusBody = (await statusPatch.json()) as { status: string };
		expect(statusBody.status).toBe("in_progress");

		const forbidden = await api(`/tasks/${task.id}`, {
			method: "PATCH",
			headers: { cookie: assignee.cookie },
			body: JSON.stringify({ name: "Nope" }),
		});
		expect(forbidden.status).toBe(404);
	});

	it("soft-archives then hard-deletes an owned task", async () => {
		const owner = await createTestUser();
		fixtures.userIds.push(owner.id);
		const task = await seedTestTask(owner, {
			name: `${TEST_NAME_PREFIX}Archive me`,
		});

		const soft = await api(`/tasks/${task.id}`, {
			method: "DELETE",
			headers: { cookie: owner.cookie },
		});
		expect(soft.status).toBe(204);

		const archivedList = await api("/tasks?archived=true", {
			headers: { cookie: owner.cookie },
		});
		expect(archivedList.status).toBe(200);
		const archivedBody = (await archivedList.json()) as {
			data: Array<{ id: number; archivedAt: string | null }>;
		};
		const archived = archivedBody.data.find((row) => row.id === task.id);
		expect(archived?.archivedAt).toBeTruthy();

		const hard = await api(`/tasks/${task.id}?hard=true`, {
			method: "DELETE",
			headers: { cookie: owner.cookie },
		});
		expect(hard.status).toBe(204);

		const db = testDb();
		const row = await db.query.tasks.findFirst({
			where: eq(tasks.id, task.id),
		});
		expect(row).toBeUndefined();
	});

	it("spawns the next occurrence when a recurring task is marked done", async () => {
		const owner = await createTestUser();
		fixtures.userIds.push(owner.id);
		const task = await seedTestTask(owner, {
			name: `${TEST_NAME_PREFIX}Weekly`,
			status: "todo",
			recurrence: "weekly",
			recurrenceInterval: 1,
			dueDate: new Date("2026-03-01T00:00:00.000Z"),
		});

		const done = await api(`/tasks/${task.id}`, {
			method: "PATCH",
			headers: { cookie: owner.cookie },
			body: JSON.stringify({ status: "done" }),
		});
		expect(done.status).toBe(200);

		const db = testDb();
		const spawned = await db.query.tasks.findMany({
			where: eq(tasks.userId, owner.id),
		});
		const next = spawned.find(
			(row) => row.id !== task.id && row.name === `${TEST_NAME_PREFIX}Weekly`,
		);
		expect(next).toBeTruthy();
		expect(next?.status).toBe("todo");
		expect(next?.dueDate?.toISOString()).toBe("2026-03-08T00:00:00.000Z");
		expect(next?.recurrence).toBe("weekly");
	});

	it("filters by owned/assigned scope and notifies on assignment", async () => {
		const owner = await createTestUser();
		const assignee = await createTestUser();
		fixtures.userIds.push(owner.id, assignee.id);

		const ownedOnly = await seedTestTask(owner, {
			name: `${TEST_NAME_PREFIX}Owned only`,
		});
		const assignedToMe = await seedTestTask(owner, {
			name: `${TEST_NAME_PREFIX}Assigned to me`,
			assigneeId: assignee.id,
		});

		const ownedScope = await api("/tasks?scope=owned", {
			headers: { cookie: owner.cookie },
		});
		expect(ownedScope.status).toBe(200);
		const ownedBody = (await ownedScope.json()) as {
			data: Array<{ id: number }>;
		};
		expect(ownedBody.data.some((row) => row.id === ownedOnly.id)).toBe(true);
		expect(ownedBody.data.some((row) => row.id === assignedToMe.id)).toBe(true);

		const assignedScope = await api("/tasks?scope=assigned", {
			headers: { cookie: assignee.cookie },
		});
		expect(assignedScope.status).toBe(200);
		const assignedBody = (await assignedScope.json()) as {
			data: Array<{ id: number }>;
		};
		expect(assignedBody.data.some((row) => row.id === assignedToMe.id)).toBe(
			true,
		);
		expect(assignedBody.data.some((row) => row.id === ownedOnly.id)).toBe(false);

		const created = await api("/tasks", {
			method: "POST",
			headers: { cookie: owner.cookie },
			body: JSON.stringify({
				name: `${TEST_NAME_PREFIX}Fresh assign`,
				assigneeId: assignee.id,
			}),
		});
		expect(created.status).toBe(201);
		const createdBody = (await created.json()) as { id: number };

		const db = testDb();
		const notify = await db.query.notifications.findFirst({
			where: and(
				eq(notifications.userId, assignee.id),
				eq(notifications.type, "task_assigned"),
			),
		});
		expect(notify?.title).toContain("Fresh assign");
		expect(
			(notify?.data as { taskId?: number } | null)?.taskId,
		).toBe(createdBody.id);
	});
});
