import createApp from "@/lib/create-app.js";

const app = createApp();

app.get("/", (c) => {
	return c.text("Hello Hono!");
});

app.get("/error", (c) => {
	c.var.logger.error("");
	throw new Error("Bisou");
});

export default app;
