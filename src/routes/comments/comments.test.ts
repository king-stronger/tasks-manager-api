import { and, eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { comments } from "@/db/schemas/comments.js";
import { notifications } from "@/db/schemas/notifications.js";
import {
	TEST_NAME_PREFIX,
	api,
	cleanupTestFixtures,
	createTestUser,
	seedTestTask,
	testDb,
} from "@/test/helpers.js";

describe("comments", () => {
	const fixtures: { userIds: string[] } = { userIds: [] };

	afterEach(async () => {
		await cleanupTestFixtures({ userIds: fixtures.userIds });
		fixtures.userIds = [];
	});

	it("lets an assignee comment and notifies the owner", async () => {
		const owner = await createTestUser();
		const assignee = await createTestUser();
		fixtures.userIds.push(owner.id, assignee.id);
		const task = await seedTestTask(owner, {
			name: `${TEST_NAME_PREFIX}Discuss`,
			assigneeId: assignee.id,
		});

		const created = await api(`/tasks/${task.id}/comments`, {
			method: "POST",
			headers: { cookie: assignee.cookie },
			body: JSON.stringify({ body: `${TEST_NAME_PREFIX}Need a review` }),
		});
		expect(created.status).toBe(201);
		const createdBody = (await created.json()) as {
			id: number;
			body: string;
			userId: string;
			author?: { id: string };
		};
		expect(createdBody.body).toBe(`${TEST_NAME_PREFIX}Need a review`);
		expect(createdBody.userId).toBe(assignee.id);
		expect(createdBody.author?.id).toBe(assignee.id);

		const listed = await api(`/tasks/${task.id}/comments`, {
			headers: { cookie: owner.cookie },
		});
		expect(listed.status).toBe(200);
		const listBody = (await listed.json()) as {
			data: Array<{ id: number }>;
		};
		expect(listBody.data.some((row) => row.id === createdBody.id)).toBe(true);

		const db = testDb();
		const notify = await db.query.notifications.findFirst({
			where: and(
				eq(notifications.userId, owner.id),
				eq(notifications.type, "comment_added"),
			),
		});
		expect(notify?.title).toContain("Discuss");
		expect(notify?.readAt).toBeNull();

		const removed = await api(`/tasks/${task.id}/comments/${createdBody.id}`, {
			method: "DELETE",
			headers: { cookie: assignee.cookie },
		});
		expect(removed.status).toBe(204);

		const commentRow = await db.query.comments.findFirst({
			where: eq(comments.id, createdBody.id),
		});
		expect(commentRow).toBeUndefined();
	});

	it("rejects comments on inaccessible tasks", async () => {
		const owner = await createTestUser();
		const stranger = await createTestUser();
		fixtures.userIds.push(owner.id, stranger.id);
		const task = await seedTestTask(owner);

		const res = await api(`/tasks/${task.id}/comments`, {
			method: "POST",
			headers: { cookie: stranger.cookie },
			body: JSON.stringify({ body: "Nope" }),
		});
		expect(res.status).toBe(404);
	});
});
