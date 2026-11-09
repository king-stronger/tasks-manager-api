import { relations } from "drizzle-orm";
import {
	pgTable,
	serial,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { user } from "./auth.js";

export const labels = pgTable(
	"labels",
	{
		id: serial("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		color: text("color"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("labels_user_id_name_uidx").on(table.userId, table.name),
	],
);

export const labelsRelations = relations(labels, ({ one }) => ({
	user: one(user, {
		fields: [labels.userId],
		references: [user.id],
	}),
}));

export const selectLabelsSchema = createSelectSchema(labels);

export const insertLabelsSchema = createInsertSchema(labels, {
	name: (schema) => schema.min(1).max(100),
	color: z
		.string()
		.regex(/^#[0-9A-Fa-f]{6}$/)
		.optional()
		.nullable(),
}).omit({
	id: true,
	userId: true,
	createdAt: true,
	updatedAt: true,
});

export const updateLabelsSchema = insertLabelsSchema.partial();
