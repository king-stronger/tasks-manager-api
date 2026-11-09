import { env } from "cloudflare:workers";
import { structuredLogger } from "@hono/structured-logger";
import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";
import pino from "pino";
import { notFound, onError, serveEmojiFavicon } from "stoker/middlewares";
import { defaultHook } from "stoker/openapi";
import { createAuth } from "./auth.js";
import type { AppBindings } from "./types.js";

const rootLogger = pino({
	level: env.LOG_LEVEL || "info",
});

export function createRouter() {
	return new OpenAPIHono<AppBindings>({
		strict: false,
		defaultHook,
	});
}

export default function createApp() {
	const app = createRouter();

	app.use(serveEmojiFavicon(""));
	app.use(requestId());
	app.use(
		structuredLogger({
			createLogger: (c) => rootLogger.child({ requestId: c.var.requestId }),
		}),
	);
	app.use(
		"*",
		cors({
			origin: (origin, c) => {
				const allowed = [
					c.env.FRONTEND_URL,
					c.env.BETTER_AUTH_URL,
					"http://localhost:5173",
					"http://127.0.0.1:5173",
					"http://localhost:8787",
					"http://127.0.0.1:8787",
				].filter(Boolean);
				if (!origin) {
					return allowed[0] ?? "*";
				}
				return allowed.includes(origin) ? origin : allowed[0] ?? "";
			},
			credentials: true,
			allowHeaders: ["Content-Type", "Authorization"],
			allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		}),
	);

	app.on(["POST", "GET"], "/api/auth/*", (c) => {
		const auth = createAuth(c.env);
		return auth.handler(c.req.raw);
	});

	app.notFound(notFound);
	app.onError(onError);

	return app;
}
