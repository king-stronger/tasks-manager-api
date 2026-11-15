import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { notifications } from "@/db/schemas/notifications.js";
import {
	TEST_NAME_PREFIX,
	api,
	cleanupTestFixtures,
	createTestUser,
	seedTestNotification,
	testDb,
} from "@/test/helpers.js";

describe("notifications", () => {
	const fixtures: { userIds: string[] } = { userIds: [] };

	afterEach(async () => {
		await cleanupTestFixtures({ userIds: fixtures.userIds });
		fixtures.userIds = [];
	});

	it("lists unread notifications and marks one as read", async () => {
		const user = await createTestUser();
		fixtures.userIds.push(user.id);
		const unread = await seedTestNotification(user, {
			title: `${TEST_NAME_PREFIX}Unread ping`,
		});
		await seedTestNotification(user, {
			title: `${TEST_NAME_PREFIX}Already read`,
			readAt: new Date("2026-01-01T00:00:00.000Z"),
		});

		const listed = await api("/notifications?unreadOnly=true", {
			headers: { cookie: user.cookie },
		});
		expect(listed.status).toBe(200);
		const listBody = (await listed.json()) as {
			data: Array<{ id: number; title: string; readAt: string | null }>;
		};
		expect(listBody.data.some((row) => row.id === unread.id)).toBe(true);
		expect(listBody.data.every((row) => row.readAt === null)).toBe(true);

		const marked = await api(`/notifications/${unread.id}/read`, {
			method: "POST",
			headers: { cookie: user.cookie },
		});
		expect(marked.status).toBe(200);
		const markedBody = (await marked.json()) as { readAt: string | null };
		expect(markedBody.readAt).toBeTruthy();

		const db = testDb();
		const row = await db.query.notifications.findFirst({
			where: eq(notifications.id, unread.id),
		});
		expect(row?.readAt).toBeTruthy();
	});

	it("marks all unread notifications as read", async () => {
		const user = await createTestUser();
		fixtures.userIds.push(user.id);
		await seedTestNotification(user, {
			title: `${TEST_NAME_PREFIX}One`,
		});
		await seedTestNotification(user, {
			title: `${TEST_NAME_PREFIX}Two`,
		});

		const res = await api("/notifications/read-all", {
			method: "POST",
			headers: { cookie: user.cookie },
		});
		expect(res.status).toBe(200);
		const body = (await res.json()) as { updated: number };
		expect(body.updated).toBeGreaterThanOrEqual(2);

		const listed = await api("/notifications?unreadOnly=true", {
			headers: { cookie: user.cookie },
		});
		const listBody = (await listed.json()) as { data: unknown[] };
		expect(listBody.data).toHaveLength(0);
	});

	it("does not expose another user's notifications", async () => {
		const owner = await createTestUser();
		const stranger = await createTestUser();
		fixtures.userIds.push(owner.id, stranger.id);
		const note = await seedTestNotification(owner, {
			title: `${TEST_NAME_PREFIX}Private note`,
		});

		const listed = await api("/notifications", {
			headers: { cookie: stranger.cookie },
		});
		expect(listed.status).toBe(200);
		const listBody = (await listed.json()) as {
			data: Array<{ id: number }>;
		};
		expect(listBody.data.some((row) => row.id === note.id)).toBe(false);

		const marked = await api(`/notifications/${note.id}/read`, {
			method: "POST",
			headers: { cookie: stranger.cookie },
		});
		expect(marked.status).toBe(404);
	});
});
