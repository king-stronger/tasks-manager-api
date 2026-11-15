function required(name: string, fallback?: string) {
	const value = process.env[name] ?? fallback;
	if (!value) {
		throw new Error(
			`Missing ${name}. Set it in .env (or DATABASE_URL_TEST for tests).`,
		);
	}
	return value;
}

/** Cloudflare Worker env shape for `app.request(..., env)`. */
export function getTestEnv(overrides: Partial<Env> = {}): Env {
	const databaseUrl =
		process.env.DATABASE_URL_TEST?.trim() ||
		process.env.DATABASE_URL?.trim() ||
		"";

	if (!databaseUrl) {
		throw new Error(
			"Set DATABASE_URL_TEST or DATABASE_URL in .env for integration tests.",
		);
	}

	return {
		LOG_LEVEL: "error",
		DATABASE_URL: databaseUrl,
		BETTER_AUTH_SECRET: required(
			"BETTER_AUTH_SECRET",
			"test-secret-at-least-32-characters-long!!",
		),
		BETTER_AUTH_URL: required("BETTER_AUTH_URL", "http://127.0.0.1:8787"),
		FRONTEND_URL: process.env.FRONTEND_URL?.trim() || "http://localhost:5173",
		// Leave Resend unset so outbound email is skipped in CI/local tests.
		APP_NAME: process.env.APP_NAME?.trim() || "Tasks Manager",
		...overrides,
	};
}
