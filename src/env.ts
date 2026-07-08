import { config } from "dotenv";
import { expand } from "dotenv-expand";
import { z, ZodError } from "zod";

expand(config());

const EnvSchema = z.object({
	NODE_ENV: z.string().default("development"),
	PORT: z.coerce.number().default(3000),
	LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]),
});

export type env = z.infer<typeof EnvSchema>;

// eslint-disable-next-line import/no-mutable-exports, ts/no-redeclare
let env: env;

try {
	// eslint-disable-next-line node/no-process-env
	env = EnvSchema.parse(process.env);
}
catch (e) {
	if (e instanceof ZodError) {
		console.error("Invalid environment variables");
		console.error(z.treeifyError(e));
	}
	else {
		console.error(e);
	}

	process.exit(1);
}

export default env;
