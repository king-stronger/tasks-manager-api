import { relations } from "drizzle-orm";
import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { user } from "./auth.js";
import { tasks } from "./tasks.js";

export const comments = pgTable("comments", {
	id: serial("id").primaryKey(),
	taskId: integer("task_id")
		.notNull()
		.references(() => tasks.id, { onDelete: "cascade" }),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	body: text("body").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),
});

export const commentsRelations = relations(comments, ({ one }) => ({
	task: one(tasks, {
		fields: [comments.taskId],
		references: [tasks.id],
	}),
	user: one(user, {
		fields: [comments.userId],
		references: [user.id],
	}),
}));

export const selectCommentsSchema = createSelectSchema(comments);

export const insertCommentsSchema = createInsertSchema(comments, {
	body: (schema) => schema.min(1).max(5000),
}).omit({
	id: true,
	taskId: true,
	userId: true,
	createdAt: true,
	updatedAt: true,
});

export const updateCommentsSchema = insertCommentsSchema.partial();
