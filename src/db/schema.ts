import { boolean, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const tasks = pgTable("tasks", {
	id: serial("id").primaryKey(),
	name: text("name").notNull(),
	done: boolean("done").notNull().default(false),
	createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp({ withTimezone: true }).defaultNow().$onUpdate(() => new Date()),
});

export const selectTasksSchema = createSelectSchema(tasks);

export const insertTasksSchema = createInsertSchema(tasks, {
	name: (schema) => schema.min(1).max(500),
})
	.required({
		done: true,
	})
	.omit({
		id: true,
		createdAt: true,
		updatedAt: true,
	});

export const updateTasksSchema = insertTasksSchema.partial();