import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from "@/db/schema.js";
import type { Environment } from "@/env.js";


export function createDb(env: Environment){
	const sql = neon(env.DATABASE_URL);
	const db = drizzle({
		client: sql,
		schema
	});

	return { db }
}