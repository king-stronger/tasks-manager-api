import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "@/db/schema.js";
import type { Environment } from "@/env.js";

export function createDb(env: Environment){
	const client = createClient({
		url: env.DATABASE_URL,
		authToken: env.DATABASE_AUTH_TOKEN,
	});

	const db = drizzle({
		client,
		schema,
	});

	return { db, client }
}