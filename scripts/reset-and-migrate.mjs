import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";

function loadEnvFile(path) {
	const text = readFileSync(path, "utf8");
	for (const line of text.split(/\r?\n/)) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const eq = trimmed.indexOf("=");
		if (eq === -1) continue;
		const key = trimmed.slice(0, eq).trim();
		let value = trimmed.slice(eq + 1).trim();
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}
		if (!(key in process.env)) process.env[key] = value;
	}
}

loadEnvFile(".env");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
	throw new Error("DATABASE_URL is required");
}

const sql = neon(databaseUrl);

console.log("dropping public schema objects...");
await sql`DROP SCHEMA public CASCADE`;
await sql`CREATE SCHEMA public`;
await sql`GRANT ALL ON SCHEMA public TO public`;

await sql`CREATE TABLE "__drizzle_migrations" (
  id SERIAL PRIMARY KEY,
  hash text NOT NULL,
  created_at bigint
)`;

const migrationsDir = join(process.cwd(), "src/db/migrations");
const files = readdirSync(migrationsDir)
	.filter((name) => name.endsWith(".sql"))
	.sort();

for (const file of files) {
	const hash = file.replace(/\.sql$/, "");
	const raw = readFileSync(join(migrationsDir, file), "utf8");
	const statements = raw
		.split("--> statement-breakpoint")
		.map((part) => part.trim())
		.filter(Boolean);

	console.log(`apply ${file} (${statements.length} statements)`);
	for (const statement of statements) {
		await sql.query(statement);
	}
	await sql`INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES (${hash}, ${Date.now()})`;
	console.log(`done ${file}`);
}

const tables = await sql`
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
  ORDER BY table_name
`;
console.log(
	"tables:",
	tables.map((row) => row.table_name).join(", "),
);
console.log("reset + migrate complete");
