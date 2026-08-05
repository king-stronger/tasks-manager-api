import { structuredLogger } from "@hono/structured-logger";
import { OpenAPIHono } from "@hono/zod-openapi";
import { requestId } from "hono/request-id";
import pino from "pino";
import { notFound, onError, serveEmojiFavicon } from "stoker/middlewares";
import { defaultHook } from "stoker/openapi";
import { parseEnv } from "@/env.js";
import type { AppBindings } from "./types.js";

export function createRouter() {
	return new OpenAPIHono<AppBindings>({
		strict: false,
		defaultHook,
	});
}

export default function createApp() {
	const app = createRouter();

	app.use((c, next) => {
		c.env = parseEnv(Object.assign(c.env || {}, process.env))
		return next()
	})
	app.use("*", async(c, next) => {
		const logger = pino({
			level: c.env.LOG_LEVEL || "info"
		});
		c.set("logger", logger)

		await next()
	})
	app.use(serveEmojiFavicon(""));
	app.use(requestId());
	app.use(
		structuredLogger({
			createLogger: (c) => c.get("logger").child({ requestId: c.var.requestId }),
		}),
	);

	app.notFound(notFound);
	app.onError(onError);

	return app;
}
