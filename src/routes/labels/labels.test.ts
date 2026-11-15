import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { labels } from "@/db/schemas/labels.js";
import {
	TEST_NAME_PREFIX,
	api,
	cleanupTestFixtures,
	createTestUser,
	testDb,
} from "@/test/helpers.js";

describe("labels", () => {
	const fixtures: { userIds: string[] } = { userIds: [] };

	afterEach(async () => {
		await cleanupTestFixtures({ userIds: fixtures.userIds });
		fixtures.userIds = [];
	});

	it("creates, lists, attaches to a task, and deletes a label", async () => {
		const owner = await createTestUser();
		fixtures.userIds.push(owner.id);

		const created = await api("/labels", {
			method: "POST",
			headers: { cookie: owner.cookie },
			body: JSON.stringify({
				name: `${TEST_NAME_PREFIX}Urgent`,
				color: "#fb7185",
			}),
		});
		expect(created.status).toBe(201);
		const createdBody = (await created.json()) as {
			id: number;
			name: string;
			color: string | null;
		};
		expect(createdBody.name).toBe(`${TEST_NAME_PREFIX}Urgent`);
		expect(createdBody.color).toBe("#fb7185");

		const listed = await api("/labels", {
			headers: { cookie: owner.cookie },
		});
		expect(listed.status).toBe(200);
		const listBody = (await listed.json()) as {
			data: Array<{ id: number }>;
		};
		expect(listBody.data.some((row) => row.id === createdBody.id)).toBe(true);

		const task = await api("/tasks", {
			method: "POST",
			headers: { cookie: owner.cookie },
			body: JSON.stringify({
				name: `${TEST_NAME_PREFIX}Labeled task`,
				labelIds: [createdBody.id],
			}),
		});
		expect(task.status).toBe(201);
		const taskBody = (await task.json()) as {
			id: number;
			labels?: Array<{ id: number; name: string }>;
		};
		expect(taskBody.labels?.some((label) => label.id === createdBody.id)).toBe(
			true,
		);

		const removed = await api(`/labels/${createdBody.id}`, {
			method: "DELETE",
			headers: { cookie: owner.cookie },
		});
		expect(removed.status).toBe(204);

		const db = testDb();
		const row = await db.query.labels.findFirst({
			where: eq(labels.id, createdBody.id),
		});
		expect(row).toBeUndefined();
	});

	it("keeps labels private to their owner", async () => {
		const owner = await createTestUser();
		const stranger = await createTestUser();
		fixtures.userIds.push(owner.id, stranger.id);

		const created = await api("/labels", {
			method: "POST",
			headers: { cookie: owner.cookie },
			body: JSON.stringify({ name: `${TEST_NAME_PREFIX}Secret` }),
		});
		expect(created.status).toBe(201);
		const createdBody = (await created.json()) as { id: number };

		const listed = await api("/labels", {
			headers: { cookie: stranger.cookie },
		});
		expect(listed.status).toBe(200);
		const listBody = (await listed.json()) as {
			data: Array<{ id: number }>;
		};
		expect(listBody.data.some((row) => row.id === createdBody.id)).toBe(false);
	});
});
