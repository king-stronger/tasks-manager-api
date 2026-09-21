import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { openAPI } from "better-auth/plugins";
import { createDb } from "../db/index.js";

type AuthEnv = Pick<Env, "DATABASE_URL" | "BETTER_AUTH_SECRET" | "BETTER_AUTH_URL">

export const createAuth = (env: AuthEnv) => {
	return betterAuth({
		database: drizzleAdapter(createDb(env), {
			provider: "pg",
		}),
		emailAndPassword: {
			enabled: true,
		},
		plugins: [openAPI()],
	});
}

export type Auth = ReturnType<typeof createAuth>