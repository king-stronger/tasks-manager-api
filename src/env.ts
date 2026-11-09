import { z } from "zod";

const envSchema = z.object({
	PORT: z.coerce.number().positive().default(3000),
	NODE_ENV: z.string().default("development"),
	LOG_LEVEL: z
		.enum(["fatal", "error", "warn", "info", "debug", "trace"])
		.default("info"),
	DATABASE_URL: z.url(),
	BETTER_AUTH_SECRET: z.string().min(1),
	BETTER_AUTH_URL: z.url(),
	RESEND_API_KEY: z.string().min(1).optional(),
	RESEND_FROM_EMAIL: z.email().optional(),
	APP_NAME: z.string().default("Tasks Manager"),
});

export type Environment = z.infer<typeof envSchema>;

export function parseEnv(data: unknown) {
	const { data: env, error } = envSchema.safeParse(data);

	if (error) {
		throw new Error(`Invalid env: ${error}`);
	}

	return env;
}

export default parseEnv(process.env);
