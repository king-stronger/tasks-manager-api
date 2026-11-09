import { relations } from "drizzle-orm";
import {
	boolean,
	integer,
	pgTable,
	serial,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { tasks } from "./tasks.js";

export const checklistItems = pgTable("checklist_items", {
	id: serial("id").primaryKey(),
	taskId: integer("task_id")
		.notNull()
		.references(() => tasks.id, { onDelete: "cascade" }),
	title: text("title").notNull(),
	done: boolean("done").notNull().default(false),
	position: integer("position").notNull().default(0),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),
});

export const checklistItemsRelations = relations(checklistItems, ({ one }) => ({
	task: one(tasks, {
		fields: [checklistItems.taskId],
		references: [tasks.id],
	}),
}));

export const selectChecklistItemsSchema = createSelectSchema(checklistItems);

export const insertChecklistItemsSchema = createInsertSchema(checklistItems, {
	title: (schema) => schema.min(1).max(500),
	done: z.boolean().optional(),
	position: z.number().int().min(0).optional(),
}).omit({
	id: true,
	taskId: true,
	createdAt: true,
	updatedAt: true,
});

export const updateChecklistItemsSchema = insertChecklistItemsSchema.partial();
