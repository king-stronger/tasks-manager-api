import { createRouter } from "@/lib/create-app.js";

import * as handlers from "./notifications.handlers.js";
import * as routes from "./notifications.routes.js";

const router = createRouter()
	.openapi(routes.list, handlers.list)
	.openapi(routes.markAllRead, handlers.markAllRead)
	.openapi(routes.markRead, handlers.markRead);

export default router;
