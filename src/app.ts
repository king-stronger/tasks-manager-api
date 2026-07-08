import { structuredLogger } from "@hono/structured-logger";
import { OpenAPIHono } from "@hono/zod-openapi";
import { requestId } from "hono/request-id";
import pino from "pino";
import { notFound, onError } from "stoker/middlewares";
import env from "./env.js";

const rootLogger = pino({
	level: env.LOG_LEVEL || "info",
	transport: {
		target: "pino-pretty",
	},
});

interface AppBindings {
	Variables: {
		logger: typeof rootLogger;
	};
}

const app = new OpenAPIHono<AppBindings>();

app.use(requestId());
app.use(
	structuredLogger({
		createLogger: c => rootLogger.child({ requestId: c.var.requestId }),
	}),
);

app.get("/", (c) => {
	return c.text("Hello Hono!");
});

app.get("/error", (c) => {
	c.var.logger.error("");
	throw new Error("Bisou");
});

app.notFound(notFound);
app.onError(onError);

export default app;
