import { Scalar } from "@scalar/hono-api-reference";
import packageJSON from "../../package.json" with { type: "json" };
import type { AppOpenApi } from "./types.js";

export function configureOpenApi(app: AppOpenApi) {
	app.openAPIRegistry.registerComponent("securitySchemes", "CookieAuth", {
		type: "apiKey",
		in: "cookie",
		name: "better-auth.session_token"
	})

	app.doc("/docs", {
		openapi: "3.1.0",
		info: {
			version: packageJSON.version,
			title: "Tasks Api",
		},
	});

	app.get(
		"/scalar",
		Scalar({
			sources: [
				{ url: "/docs", title: "API" },
				{ url: "/api/auth/open-api/generate-schema", title: "AUTH" }
			],
			theme: "kepler",
			layout: "modern",
			defaultHttpClient: {
				targetKey: "js",
				clientKey: "fetch",
			},
		}),
	);
}
