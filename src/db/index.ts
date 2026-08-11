import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from "@/db/schema.js";


export function createDb(env: Env){
	const sql = neon(env.DATABASE_URL);
	const db = drizzle({
		client: sql,
		schema
	});

	return { db }
}