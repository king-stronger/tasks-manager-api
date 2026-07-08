import { sql } from "drizzle-orm";
import { int, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const tasks = sqliteTable("tasks", {
	id: int().primaryKey({ autoIncrement: true }),
	name: text().notNull(),
	done: integer({ mode: "boolean" }).notNull().default(false),
	createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(CURRENT_TIMESTAMP)`).$onUpdate(() => new Date()),
});

export const selectTasksSchema = createSelectSchema(tasks);
