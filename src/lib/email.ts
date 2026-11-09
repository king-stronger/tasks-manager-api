type EmailEnv = {
	RESEND_API_KEY?: string;
	RESEND_FROM_EMAIL?: string;
	APP_NAME?: string;
};

export async function sendEmail(
	env: EmailEnv,
	input: { to: string; subject: string; text: string },
) {
	if (!env.RESEND_API_KEY) {
		return {
			ok: false as const,
			skipped: true as const,
			reason: "missing_api_key",
		};
	}

	const from = env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
	const appName = env.APP_NAME || "Tasks Manager";

	const response = await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${env.RESEND_API_KEY}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			from: `${appName} <${from}>`,
			to: [input.to],
			subject: input.subject,
			text: input.text,
		}),
	});

	if (!response.ok) {
		const detail = await response.text();
		return {
			ok: false as const,
			skipped: false as const,
			reason: detail || response.statusText,
		};
	}

	return { ok: true as const, skipped: false as const };
}
