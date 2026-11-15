import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { checklistItems } from "@/db/schemas/checklist-items.js";
import {
	TEST_NAME_PREFIX,
	api,
	cleanupTestFixtures,
	createTestUser,
	seedTestTask,
	testDb,
} from "@/test/helpers.js";

describe("checklist", () => {
	const fixtures: { userIds: string[] } = { userIds: [] };

	afterEach(async () => {
		await cleanupTestFixtures({ userIds: fixtures.userIds });
		fixtures.userIds = [];
	});

	it("creates, toggles, lists, and deletes checklist items on an owned task", async () => {
		const owner = await createTestUser();
		fixtures.userIds.push(owner.id);
		const task = await seedTestTask(owner, {
			name: `${TEST_NAME_PREFIX}Checklist host`,
		});

		const created = await api(`/tasks/${task.id}/checklist`, {
			method: "POST",
			headers: { cookie: owner.cookie },
			body: JSON.stringify({ title: `${TEST_NAME_PREFIX}Item A` }),
		});
		expect(created.status).toBe(201);
		const createdBody = (await created.json()) as {
			id: number;
			title: string;
			done: boolean;
			taskId: number;
		};
		expect(createdBody.title).toBe(`${TEST_NAME_PREFIX}Item A`);
		expect(createdBody.done).toBe(false);
		expect(createdBody.taskId).toBe(task.id);

		const toggled = await api(`/tasks/${task.id}/checklist/${createdBody.id}`, {
			method: "PATCH",
			headers: { cookie: owner.cookie },
			body: JSON.stringify({ done: true }),
		});
		expect(toggled.status).toBe(200);
		const toggledBody = (await toggled.json()) as { done: boolean };
		expect(toggledBody.done).toBe(true);

		const listed = await api(`/tasks/${task.id}/checklist`, {
			headers: { cookie: owner.cookie },
		});
		expect(listed.status).toBe(200);
		const listBody = (await listed.json()) as Array<{ id: number; done: boolean }>;
		expect(listBody.some((item) => item.id === createdBody.id && item.done)).toBe(
			true,
		);

		const removed = await api(
			`/tasks/${task.id}/checklist/${createdBody.id}`,
			{
				method: "DELETE",
				headers: { cookie: owner.cookie },
			},
		);
		expect(removed.status).toBe(204);

		const db = testDb();
		const row = await db.query.checklistItems.findFirst({
			where: eq(checklistItems.id, createdBody.id),
		});
		expect(row).toBeUndefined();
	});

	it("hides checklist of tasks the caller cannot access", async () => {
		const owner = await createTestUser();
		const stranger = await createTestUser();
		fixtures.userIds.push(owner.id, stranger.id);
		const task = await seedTestTask(owner);

		const res = await api(`/tasks/${task.id}/checklist`, {
			headers: { cookie: stranger.cookie },
		});
		expect(res.status).toBe(404);
	});
});
