import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { openAPI } from "better-auth/plugins";
import { createDb } from "../db/index.js";
import * as schema from "../db/schema.js";

type AuthEnv = Pick<
	Env,
	"DATABASE_URL" | "BETTER_AUTH_SECRET" | "BETTER_AUTH_URL" | "FRONTEND_URL"
>;

export const createAuth = (env: AuthEnv) => {
	const { db } = createDb(env);
	const trustedOrigins = [
		env.BETTER_AUTH_URL,
		env.FRONTEND_URL,
		"http://localhost:5173",
		"http://127.0.0.1:5173",
		"http://localhost:8787",
		"http://127.0.0.1:8787",
	].filter(
		(origin, index, all): origin is string =>
			Boolean(origin) && all.indexOf(origin) === index,
	);

	return betterAuth({
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
		trustedOrigins,
		database: drizzleAdapter(db, {
			provider: "pg",
			schema,
		}),
		emailAndPassword: {
			enabled: true,
		},
		plugins: [openAPI()],
	});
};

export type Auth = ReturnType<typeof createAuth>;
