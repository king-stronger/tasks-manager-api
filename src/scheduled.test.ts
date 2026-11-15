import { and, eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { notifications } from "@/db/schemas/notifications.js";
import { handleScheduled } from "@/scheduled.js";
import {
	TEST_NAME_PREFIX,
	cleanupTestFixtures,
	createTestUser,
	seedTestTask,
	testDb,
	testEnv,
} from "@/test/helpers.js";

describe("scheduled due-soon cron", () => {
	const fixtures: { userIds: string[] } = { userIds: [] };

	afterEach(async () => {
		await cleanupTestFixtures({ userIds: fixtures.userIds });
		fixtures.userIds = [];
	});

	it("notifies owner and assignee for tasks due within 24h, once", async () => {
		const owner = await createTestUser();
		const assignee = await createTestUser();
		fixtures.userIds.push(owner.id, assignee.id);

		const dueSoon = await seedTestTask(owner, {
			name: `${TEST_NAME_PREFIX}Due soon`,
			assigneeId: assignee.id,
			status: "todo",
			dueDate: new Date(Date.now() + 6 * 60 * 60 * 1000),
		});
		await seedTestTask(owner, {
			name: `${TEST_NAME_PREFIX}Already done`,
			status: "done",
			dueDate: new Date(Date.now() + 3 * 60 * 60 * 1000),
		});
		await seedTestTask(owner, {
			name: `${TEST_NAME_PREFIX}Far away`,
			status: "todo",
			dueDate: new Date(Date.now() + 72 * 60 * 60 * 1000),
		});
		await seedTestTask(owner, {
			name: `${TEST_NAME_PREFIX}Archived soon`,
			status: "todo",
			dueDate: new Date(Date.now() + 4 * 60 * 60 * 1000),
			archivedAt: new Date(),
		});

		await handleScheduled(testEnv());

		const db = testDb();
		const created = await db.query.notifications.findMany({
			where: and(
				eq(notifications.type, "task_due_soon"),
				eq(notifications.title, `Due soon: ${TEST_NAME_PREFIX}Due soon`),
			),
		});

		const recipients = created.map((row) => row.userId).sort();
		expect(recipients).toEqual([assignee.id, owner.id].sort());
		expect(
			created.every(
				(row) => (row.data as { taskId?: number } | null)?.taskId === dueSoon.id,
			),
		).toBe(true);

		await handleScheduled(testEnv());
		const afterSecondPass = await db.query.notifications.findMany({
			where: and(
				eq(notifications.type, "task_due_soon"),
				eq(notifications.title, `Due soon: ${TEST_NAME_PREFIX}Due soon`),
			),
		});
		expect(afterSecondPass).toHaveLength(2);
	});
});
