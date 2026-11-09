const BASE = process.env.API_BASE || "http://127.0.0.1:8787";

const jar = new Map();

function storeCookies(response) {
	const raw = response.headers.getSetCookie?.() ?? [];
	for (const cookie of raw) {
		const [pair] = cookie.split(";");
		const eq = pair.indexOf("=");
		if (eq === -1) continue;
		jar.set(pair.slice(0, eq), pair.slice(eq + 1));
	}
	// fallback for environments without getSetCookie
	const single = response.headers.get("set-cookie");
	if (single && raw.length === 0) {
		for (const part of single.split(/,(?=\s*[^;]+=)/)) {
			const [pair] = part.trim().split(";");
			const eq = pair.indexOf("=");
			if (eq === -1) continue;
			jar.set(pair.slice(0, eq), pair.slice(eq + 1));
		}
	}
}

function cookieHeader() {
	return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function req(method, path, { body, expectStatus } = {}) {
	const response = await fetch(`${BASE}${path}`, {
		method,
		headers: {
			"content-type": "application/json",
			origin: process.env.AUTH_ORIGIN || "http://localhost:8787",
			cookie: cookieHeader(),
		},
		body: body ? JSON.stringify(body) : undefined,
	});
	storeCookies(response);
	const text = await response.text();
	let json = null;
	try {
		json = text ? JSON.parse(text) : null;
	} catch {
		json = { raw: text };
	}
	const ok =
		expectStatus == null
			? response.ok
			: response.status === expectStatus;
	if (!ok) {
		throw new Error(
			`${method} ${path} => ${response.status} (expected ${expectStatus ?? "2xx"}): ${text.slice(0, 500)}`,
		);
	}
	return { status: response.status, json };
}

function assert(condition, message) {
	if (!condition) throw new Error(message);
}

const stamp = Date.now();
const emailA = `owner_${stamp}@example.com`;
const emailB = `assignee_${stamp}@example.com`;
const password = "TestPass123!";

const results = [];

async function step(name, fn) {
	process.stdout.write(`• ${name}... `);
	await fn();
	console.log("ok");
	results.push(name);
}

try {
	await step("health", async () => {
		const { json } = await req("GET", "/");
		assert(json?.message, "missing index message");
	});

	await step("signup owner", async () => {
		await req("POST", "/api/auth/sign-up/email", {
			body: { name: "Owner", email: emailA, password },
			expectStatus: 200,
		});
	});

	let ownerId;
	await step("session owner", async () => {
		const { json } = await req("GET", "/api/auth/get-session");
		assert(json?.user?.id, "no owner session");
		ownerId = json.user.id;
	});

	let projectId;
	await step("create project", async () => {
		const { json } = await req("POST", "/projects", {
			body: { name: "Personal", description: "Main" },
			expectStatus: 201,
		});
		projectId = json.id;
	});

	let labelId;
	await step("create label", async () => {
		const { json } = await req("POST", "/labels", {
			body: { name: "urgent", color: "#ff0000" },
			expectStatus: 201,
		});
		labelId = json.id;
	});

	let taskId;
	await step("create task", async () => {
		const due = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
		const { json } = await req("POST", "/tasks", {
			body: {
				name: "Ship backend",
				description: "Verify API",
				status: "todo",
				priority: "high",
				dueDate: due,
				projectId,
				labelIds: [labelId],
				recurrence: "daily",
				recurrenceInterval: 1,
			},
			expectStatus: 201,
		});
		taskId = json.id;
		assert(json.labels?.length === 1, "labels not returned");
		assert(json.recurrence === "daily", "recurrence missing");
	});

	await step("list tasks filtered", async () => {
		const { json } = await req(
			"GET",
			`/tasks?status=todo&priority=high&projectId=${projectId}&q=Ship`,
		);
		assert(json.data?.some((t) => t.id === taskId), "task missing in list");
		assert(json.meta?.total >= 1, "meta missing");
	});

	let checklistId;
	await step("checklist CRUD", async () => {
		const created = await req("POST", `/tasks/${taskId}/checklist`, {
			body: { title: "Write tests", position: 0 },
			expectStatus: 201,
		});
		checklistId = created.json.id;
		await req("PATCH", `/tasks/${taskId}/checklist/${checklistId}`, {
			body: { done: true },
		});
		const listed = await req("GET", `/tasks/${taskId}/checklist`);
		assert(
			listed.json.some((item) => item.id === checklistId && item.done === true),
			"checklist not updated",
		);
	});

	await step("comments CRUD", async () => {
		const created = await req("POST", `/tasks/${taskId}/comments`, {
			body: { body: "First note" },
			expectStatus: 201,
		});
		const commentId = created.json.id;
		await req("PATCH", `/tasks/${taskId}/comments/${commentId}`, {
			body: { body: "Updated note" },
		});
		const listed = await req("GET", `/tasks/${taskId}/comments`);
		assert(
			listed.json.data.some(
				(c) => c.id === commentId && c.body === "Updated note",
			),
			"comment missing",
		);
	});

	// second user for assignee + notifications
	jar.clear();
	await step("signup assignee", async () => {
		await req("POST", "/api/auth/sign-up/email", {
			body: { name: "Assignee", email: emailB, password },
			expectStatus: 200,
		});
	});

	let assigneeId;
	await step("session assignee", async () => {
		const { json } = await req("GET", "/api/auth/get-session");
		assigneeId = json.user.id;
		assert(assigneeId && assigneeId !== ownerId, "assignee id invalid");
	});

	// switch back to owner
	jar.clear();
	await step("signin owner", async () => {
		await req("POST", "/api/auth/sign-in/email", {
			body: { email: emailA, password },
			expectStatus: 200,
		});
	});

	await step("assign task", async () => {
		const { json } = await req("PATCH", `/tasks/${taskId}`, {
			body: { assigneeId },
		});
		assert(json.assigneeId === assigneeId, "assignee not set");
	});

	await step("assignee can see assigned task", async () => {
		jar.clear();
		await req("POST", "/api/auth/sign-in/email", {
			body: { email: emailB, password },
			expectStatus: 200,
		});
		const { json } = await req("GET", "/tasks?scope=assigned");
		assert(json.data.some((t) => t.id === taskId), "assigned scope empty");
		await req("PATCH", `/tasks/${taskId}`, {
			body: { status: "in_progress" },
		});
	});

	await step("notifications for assignee", async () => {
		const { json } = await req("GET", "/notifications");
		assert(
			json.data.some((n) => n.type === "task_assigned"),
			"missing task_assigned notification",
		);
		const unread = json.data.find((n) => !n.readAt);
		if (unread) {
			await req("POST", `/notifications/${unread.id}/read`);
		}
		await req("POST", "/notifications/read-all");
	});

	await step("recurrence spawns next task", async () => {
		jar.clear();
		await req("POST", "/api/auth/sign-in/email", {
			body: { email: emailA, password },
			expectStatus: 200,
		});
		await req("PATCH", `/tasks/${taskId}`, {
			body: { status: "done" },
		});
		const { json } = await req("GET", "/tasks?status=todo&q=Ship");
		assert(
			json.data.some((t) => t.id !== taskId && t.recurrence === "daily"),
			"next occurrence not spawned",
		);
	});

	await step("soft archive task", async () => {
		await req("DELETE", `/tasks/${taskId}`, { expectStatus: 204 });
		const active = await req("GET", "/tasks");
		assert(
			!active.json.data.some((t) => t.id === taskId),
			"archived task still active",
		);
		const archived = await req("GET", "/tasks?archived=true");
		assert(
			archived.json.data.some((t) => t.id === taskId),
			"archived task not listed",
		);
	});

	await step("cleanup checklist delete", async () => {
		await req("DELETE", `/tasks/${taskId}/checklist/${checklistId}`, {
			expectStatus: 204,
		});
	});

	console.log(`\nAll ${results.length} checks passed.`);
} catch (error) {
	console.error("\nFAILED:", error.message);
	process.exit(1);
}
