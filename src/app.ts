import { configureOpenApi } from "@/lib/configure-open-api.js";
import createApp from "@/lib/create-app.js";
import checklist from "@/routes/checklist/checklist.index.js";
import comments from "@/routes/comments/comments.index.js";
import index from "@/routes/index.route.js";
import labels from "@/routes/labels/labels.index.js";
import notifications from "@/routes/notifications/notifications.index.js";
import projects from "@/routes/projects/projects.index.js";
import tasks from "@/routes/tasks/tasks.index.js";
import { handleScheduled } from "@/scheduled.js";

const app = createApp();

const routes = [
	index,
	tasks,
	projects,
	labels,
	checklist,
	comments,
	notifications,
];

configureOpenApi(app);

routes.forEach((route) => {
	app.route("/", route);
});

export default {
	fetch: app.fetch,
	async scheduled(
		_controller: ScheduledController,
		env: Env,
		ctx: ExecutionContext,
	) {
		ctx.waitUntil(handleScheduled(env));
	},
};
