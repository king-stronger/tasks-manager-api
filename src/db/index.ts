import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema.js";

type DBEnv = Pick<Env, "DATABASE_URL">

export function createDb(env: DBEnv) {
	const sql = neon(env.DATABASE_URL);
	const db = drizzle({
		client: sql,
		schema,
	});

	return { db };
}
