import type { AppOpenApi } from "./types.js";

import packageJSON from "../../package.json" with { type: "json" };

export function configureOpenApi(app: AppOpenApi) {
	app.doc("/doc", {
		openapi: "3.0.0",
		info: {
			version: packageJSON.version,
			title: "Tasks Api",
		},
	});
}
