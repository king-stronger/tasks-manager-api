import { createMiddleware } from "hono/factory";
import type { AppBindings } from "../lib/types.js";

/** Paths whose response is identical for every caller. */
const PUBLIC_PATHS = new Set(["/", "/docs"]);

export const PUBLIC_CACHE_CONTROL =
	"public, max-age=300, stale-while-revalidate=86400";
export const PRIVATE_CACHE_CONTROL = "private, no-cache";

/**
 * Everything else depends on the session cookie: shared caches must not store it,
 * and browsers must revalidate.
 */
export const cacheControl = createMiddleware<AppBindings>(async (c, next) => {
	await next();
	const preset = c.res.headers.has("Cache-Control");
	if (c.req.method === "GET" && c.res.ok && PUBLIC_PATHS.has(c.req.path)) {
		if (!preset) c.header("Cache-Control", PUBLIC_CACHE_CONTROL);
		return;
	}
	if (!preset) c.header("Cache-Control", PRIVATE_CACHE_CONTROL);
	c.header("Vary", "Cookie", { append: true });
});
