import type { AppOpenApi } from "./types.js";

import { Scalar } from "@scalar/hono-api-reference";
import packageJSON from "../../package.json" with { type: "json" };

export function configureOpenApi(app: AppOpenApi) {
	app.doc("/doc", {
		openapi: "3.1.0",
		info: {
			version: packageJSON.version,
			title: "Tasks Api",
		},
	});

	app.get("/scalar", Scalar({
		url: "/doc",
		theme: "kepler",
		layout: "modern",
		defaultHttpClient: {
			targetKey: "js",
			clientKey: "fetch",
		},
	}));
}
