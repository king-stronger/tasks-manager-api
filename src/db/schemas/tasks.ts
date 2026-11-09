import { relations } from "drizzle-orm";
import {
	integer,
	pgEnum,
	pgTable,
	primaryKey,
	serial,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { user } from "./auth.js";
import { labels } from "./labels.js";
import { projects } from "./projects.js";

export const taskStatusEnum = pgEnum("task_status", [
	"todo",
	"in_progress",
	"done",
]);

export const taskPriorityEnum = pgEnum("task_priority", [
	"low",
	"medium",
	"high",
]);

export const tasks = pgTable("tasks", {
	id: serial("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	projectId: integer("project_id").references(() => projects.id, {
		onDelete: "set null",
	}),
	name: text("name").notNull(),
	description: text("description"),
	status: taskStatusEnum("status").notNull().default("todo"),
	priority: taskPriorityEnum("priority").notNull().default("medium"),
	dueDate: timestamp("due_date", { withTimezone: true }),
	position: integer("position").notNull().default(0),
	archivedAt: timestamp("archived_at", { withTimezone: true }),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),
});

export const taskLabels = pgTable(
	"task_labels",
	{
		taskId: integer("task_id")
			.notNull()
			.references(() => tasks.id, { onDelete: "cascade" }),
		labelId: integer("label_id")
			.notNull()
			.references(() => labels.id, { onDelete: "cascade" }),
	},
	(table) => [primaryKey({ columns: [table.taskId, table.labelId] })],
);

export const tasksRelations = relations(tasks, ({ one, many }) => ({
	user: one(user, {
		fields: [tasks.userId],
		references: [user.id],
	}),
	project: one(projects, {
		fields: [tasks.projectId],
		references: [projects.id],
	}),
	taskLabels: many(taskLabels),
}));

export const taskLabelsRelations = relations(taskLabels, ({ one }) => ({
	task: one(tasks, {
		fields: [taskLabels.taskId],
		references: [tasks.id],
	}),
	label: one(labels, {
		fields: [taskLabels.labelId],
		references: [labels.id],
	}),
}));

export const taskStatusSchema = z.enum(["todo", "in_progress", "done"]);
export const taskPrioritySchema = z.enum(["low", "medium", "high"]);

export const selectTasksSchema = createSelectSchema(tasks);

export const insertTasksSchema = createInsertSchema(tasks, {
	name: (schema) => schema.min(1).max(500),
	description: (schema) => schema.max(5000).optional().nullable(),
	status: taskStatusSchema.optional(),
	priority: taskPrioritySchema.optional(),
	dueDate: z.coerce.date().optional().nullable(),
	position: z.number().int().min(0).optional(),
	projectId: z.number().int().positive().optional().nullable(),
})
	.omit({
		id: true,
		userId: true,
		archivedAt: true,
		createdAt: true,
		updatedAt: true,
	})
	.extend({
		labelIds: z.array(z.number().int().positive()).optional(),
	});

export const updateTasksSchema = insertTasksSchema
	.extend({
		archivedAt: z.coerce.date().nullable().optional(),
	})
	.partial();
