import { describe, expect, it } from "vitest";
import { buildPaginatedResponse, getPagination } from "@/lib/pagination.js";

describe("pagination helpers", () => {
	it("defaults page and limit and computes offset", () => {
		expect(getPagination()).toEqual({ page: 1, limit: 20, offset: 0 });
		expect(getPagination(3, 10)).toEqual({ page: 3, limit: 10, offset: 20 });
	});

	it("builds meta with at least one total page", () => {
		expect(buildPaginatedResponse(["a"], 0, 1, 20)).toEqual({
			data: ["a"],
			meta: { page: 1, limit: 20, total: 0, totalPages: 1 },
		});
		expect(buildPaginatedResponse([1, 2], 25, 2, 10).meta).toEqual({
			page: 2,
			limit: 10,
			total: 25,
			totalPages: 3,
		});
	});
});
