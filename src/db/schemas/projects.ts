import { relations } from "drizzle-orm";
import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { user } from "./auth.js";

export const projects = pgTable("projects", {
	id: serial("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	description: text("description"),
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

export const projectsRelations = relations(projects, ({ one }) => ({
	user: one(user, {
		fields: [projects.userId],
		references: [user.id],
	}),
}));

export const selectProjectsSchema = createSelectSchema(projects);

export const insertProjectsSchema = createInsertSchema(projects, {
	name: (schema) => schema.min(1).max(200),
	description: (schema) => schema.max(2000).optional().nullable(),
	position: z.number().int().min(0).optional(),
}).omit({
	id: true,
	userId: true,
	archivedAt: true,
	createdAt: true,
	updatedAt: true,
});

export const updateProjectsSchema = insertProjectsSchema
	.extend({
		archivedAt: z.coerce.date().nullable().optional(),
	})
	.partial();
