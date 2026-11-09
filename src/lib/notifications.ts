import { eq } from "drizzle-orm";
import type { z } from "zod";
import type { createDb } from "@/db/index.js";
import { user } from "@/db/schemas/auth.js";
import {
	notifications,
	type notificationTypeSchema,
} from "@/db/schemas/notifications.js";
import { sendEmail } from "@/lib/email.js";

type Db = ReturnType<typeof createDb>["db"];
type NotificationType = z.infer<typeof notificationTypeSchema>;

type NotifyEnv = {
	RESEND_API_KEY?: string;
	RESEND_FROM_EMAIL?: string;
	APP_NAME?: string;
};

export async function createNotification(
	db: Db,
	env: NotifyEnv,
	input: {
		userId: string;
		type: NotificationType;
		title: string;
		body: string;
		data?: Record<string, unknown>;
		sendEmail?: boolean;
	},
) {
	const [created] = await db
		.insert(notifications)
		.values({
			userId: input.userId,
			type: input.type,
			title: input.title,
			body: input.body,
			data: input.data ?? {},
		})
		.returning();

	if (!input.sendEmail) {
		return created;
	}

	const recipient = await db.query.user.findFirst({
		where: eq(user.id, input.userId),
		columns: { email: true },
	});

	if (!recipient?.email) {
		return created;
	}

	const result = await sendEmail(env, {
		to: recipient.email,
		subject: input.title,
		text: input.body,
	});

	if (result.ok) {
		const [updated] = await db
			.update(notifications)
			.set({ emailSentAt: new Date() })
			.where(eq(notifications.id, created.id))
			.returning();
		return updated;
	}

	return created;
}
