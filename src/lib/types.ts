import type { OpenAPIHono, RouteConfig, RouteHandler } from "@hono/zod-openapi";
import type { Logger } from "pino";
import type { Environment } from "@/env.js";

export interface AppBindings {
	Bindings: Environment;
	Variables: {
		logger: Logger;
	};
}

export type AppOpenApi = OpenAPIHono<AppBindings>;

export type AppRouteHandler<R extends RouteConfig> = RouteHandler<
	R,
	AppBindings
>;
