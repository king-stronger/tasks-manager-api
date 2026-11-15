import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { projects } from "@/db/schemas/projects.js";
import {
	TEST_NAME_PREFIX,
	api,
	cleanupTestFixtures,
	createTestUser,
	testDb,
} from "@/test/helpers.js";

describe("projects", () => {
	const fixtures: { userIds: string[] } = { userIds: [] };

	afterEach(async () => {
		await cleanupTestFixtures({ userIds: fixtures.userIds });
		fixtures.userIds = [];
	});

	it("creates, lists, and soft-archives a project", async () => {
		const owner = await createTestUser();
		fixtures.userIds.push(owner.id);

		const created = await api("/projects", {
			method: "POST",
			headers: { cookie: owner.cookie },
			body: JSON.stringify({
				name: `${TEST_NAME_PREFIX}Alpha`,
				description: "First project",
			}),
		});
		expect(created.status).toBe(201);
		const createdBody = (await created.json()) as {
			id: number;
			name: string;
			userId: string;
		};
		expect(createdBody.name).toBe(`${TEST_NAME_PREFIX}Alpha`);
		expect(createdBody.userId).toBe(owner.id);

		const listed = await api("/projects", {
			headers: { cookie: owner.cookie },
		});
		expect(listed.status).toBe(200);
		const listBody = (await listed.json()) as {
			data: Array<{ id: number }>;
		};
		expect(listBody.data.some((project) => project.id === createdBody.id)).toBe(
			true,
		);

		const archived = await api(`/projects/${createdBody.id}`, {
			method: "DELETE",
			headers: { cookie: owner.cookie },
		});
		expect(archived.status).toBe(204);

		const db = testDb();
		const row = await db.query.projects.findFirst({
			where: eq(projects.id, createdBody.id),
		});
		expect(row?.archivedAt).toBeTruthy();
	});

	it("hides another user's projects", async () => {
		const owner = await createTestUser();
		const stranger = await createTestUser();
		fixtures.userIds.push(owner.id, stranger.id);

		const created = await api("/projects", {
			method: "POST",
			headers: { cookie: owner.cookie },
			body: JSON.stringify({ name: `${TEST_NAME_PREFIX}Private` }),
		});
		expect(created.status).toBe(201);
		const createdBody = (await created.json()) as { id: number };

		const listed = await api("/projects", {
			headers: { cookie: stranger.cookie },
		});
		expect(listed.status).toBe(200);
		const listBody = (await listed.json()) as {
			data: Array<{ id: number }>;
		};
		expect(listBody.data.some((project) => project.id === createdBody.id)).toBe(
			false,
		);
	});
});
