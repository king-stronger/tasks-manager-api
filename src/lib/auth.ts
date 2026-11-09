import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { openAPI } from "better-auth/plugins";
import { createDb } from "../db/index.js";
import * as schema from "../db/schema.js";

type AuthEnv = Pick<
	Env,
	"DATABASE_URL" | "BETTER_AUTH_SECRET" | "BETTER_AUTH_URL"
>;

export const createAuth = (env: AuthEnv) => {
	const { db } = createDb(env);

	return betterAuth({
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
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
