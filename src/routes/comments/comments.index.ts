import { createRouter } from "@/lib/create-app.js";

import * as handlers from "./comments.handlers.js";
import * as routes from "./comments.routes.js";

const router = createRouter()
	.openapi(routes.list, handlers.list)
	.openapi(routes.create, handlers.create)
	.openapi(routes.update, handlers.update)
	.openapi(routes.remove, handlers.remove);

export default router;
