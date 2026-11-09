import { relations } from "drizzle-orm";
import {
	jsonb,
	pgEnum,
	pgTable,
	serial,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { user } from "./auth.js";

export const notificationTypeEnum = pgEnum("notification_type", [
	"task_assigned",
	"task_due_soon",
	"comment_added",
]);

export const notifications = pgTable("notifications", {
	id: serial("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	type: notificationTypeEnum("type").notNull(),
	title: text("title").notNull(),
	body: text("body").notNull(),
	data: jsonb("data").$type<Record<string, unknown>>().default({}),
	readAt: timestamp("read_at", { withTimezone: true }),
	emailSentAt: timestamp("email_sent_at", { withTimezone: true }),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
	user: one(user, {
		fields: [notifications.userId],
		references: [user.id],
	}),
}));

export const notificationTypeSchema = z.enum([
	"task_assigned",
	"task_due_soon",
	"comment_added",
]);

export const selectNotificationsSchema = createSelectSchema(notifications);
