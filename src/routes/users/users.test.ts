import { afterEach, describe, expect, it } from "vitest";
import {
	api,
	cleanupTestFixtures,
	createTestUser,
} from "@/test/helpers.js";

describe("users", () => {
	const fixtures: { userIds: string[] } = { userIds: [] };

	afterEach(async () => {
		await cleanupTestFixtures({ userIds: fixtures.userIds });
		fixtures.userIds = [];
	});

	it("requires auth to list users", async () => {
		const res = await api("/users");
		expect(res.status).toBe(401);
	});

	it("lists users for a signed-in caller and supports q search", async () => {
		const suffix = crypto.randomUUID().slice(0, 8);
		const self = await createTestUser({
			email: `search-${suffix}@tasks-manager.test`,
			name: `[test-tm] Searchable ${suffix}`,
		});
		fixtures.userIds.push(self.id);

		const res = await api(`/users?q=${encodeURIComponent(suffix)}`, {
			headers: { cookie: self.cookie },
		});
		expect(res.status).toBe(200);
		const body = (await res.json()) as {
			data: Array<{ id: string; email: string; name: string }>;
			meta: { total: number };
		};
		expect(body.data.some((row) => row.id === self.id)).toBe(true);
		expect(body.meta.total).toBeGreaterThanOrEqual(1);
	});
});
