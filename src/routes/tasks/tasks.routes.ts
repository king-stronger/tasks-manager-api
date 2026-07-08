import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";
import { selectTasksSchema } from "@/db/schema.js";

const tags = ["Tasks"];

export const list = createRoute({
	tags,
	method: "get",
	path: "/tasks",
	responses: {
		[HttpStatusCodes.OK]: jsonContent(
			z.array(selectTasksSchema),
			"The list of tasks",
		),
	},
});

export type ListRoute = typeof list;
