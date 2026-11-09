import type { Context } from "hono";
import type { AppBindings } from "./types.js";

export function getAuthenticatedUser(c: Context<AppBindings>) {
	const user = c.get("user");
	if (!user) {
		throw new Error("Authenticated user missing; requireAuth must run first");
	}
	return user;
}
