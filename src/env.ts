import { config } from "dotenv";
import { expand } from "dotenv-expand";
import { z } from "zod";

expand(config());

const envSchema = z.object({
	PORT: z.number().positive().default(3000),
	NODE_ENV: z.string().default("development"),
	LOG_LEVEL: z
		.enum(["fatal", "error", "warn", "info", "debug", "trace"])
		.default("info"),
	DATABASE_URL: z.url(),
});

export type Environment = z.infer<typeof envSchema>;

export function parseEnv(data: unknown) {
	const { data: env, error } = envSchema.safeParse(data);

	if (error) {
		throw new Error(`Invalid error: ${error}`);
	}

	return env;
}

export default parseEnv(process.env);
