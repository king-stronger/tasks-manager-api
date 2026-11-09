import { z } from "@hono/zod-openapi";

export const TaskIdParamsSchema = z.object({
	taskId: z.coerce
		.number()
		.int()
		.positive()
		.openapi({
			param: { name: "taskId", in: "path" },
			example: 1,
		}),
});

export const TaskNestedIdParamsSchema = TaskIdParamsSchema.extend({
	id: z.coerce
		.number()
		.int()
		.positive()
		.openapi({
			param: { name: "id", in: "path" },
			example: 1,
		}),
});
