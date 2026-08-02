import { config } from "dotenv";
import { expand } from "dotenv-expand";
import { z } from "zod";

expand(config());

const envSchema = z
	.object({
		NODE_ENV: z.string().default("development"),
		PORT: z.coerce.number().default(3000),
		LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]),
		DATABASE_URL: z.url(),
		DATABASE_AUTH_TOKEN: z.string().optional(),
	})
	.refine((input) => {
		if (input.NODE_ENV === "production") {
			return !!input.DATABASE_AUTH_TOKEN;
		}

		return true;
	});

export type env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
	throw new Error(`Invalid error ${parsed.error.flatten}`);
}

const env = parsed.data;

export default env;
