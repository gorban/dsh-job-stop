import z from "@deepseek-ai/schemastery";
import { boundContextSummary, createUserMessage } from "@deepseek-ai/dsh-llm";
import { JobId } from "@deepseek-ai/dsh-jobs";
import { SessionId } from "@deepseek-ai/dsh-session";
//#region src/protocol.ts
/**
* The one wire contract shared by this plugin's host and browser halves.
*
* It deliberately imports nothing: the browser half inlines this module into
* the client bundle, so it must stay free of host-only packages.
* @module @gorban/dsh-job-stop/protocol
*/
/** The exact authenticated route the browser half posts to. */
const JOB_STOP_PATH = "/api/dsh-job-stop/kill";
/** Build one JSON response with the plugin's no-store posture. */
function jobStopJson(body, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"content-type": "application/json; charset=utf-8",
			"cache-control": "no-store"
		}
	});
}
//#endregion
//#region src/index.ts
/**
* Host half of `@gorban/dsh-job-stop`.
*
* The web client's background-job list is a read-only projection of
* `ctx.jobs`, so the only way to stop a job used to be the model's `job_kill`
* tool. This plugin adds the human's path: one authenticated route the browser
* half posts to, which fences the kill against the Session's exact live Agent
* and then tells that Agent what happened.
*
* Four decisions are worth recording, because each was a mistake waiting to be
* made.
*
* **The route lives behind the Connection trust fence.** It is claimed through
* `ctx.connection.fetch.register`, not `ctx.webServer.register`. `WebServer`
* matches its exact table before its prefix table, and Connection owns `/api`
* as a *prefix* route whose handler runs `requestRejection` (host and Origin
* trust plus browser authentication) before dispatching anything — so an exact
* `/api/...` route runs *ahead* of that fence. That is acceptable for a prompt
* toggle and wrong for a mutating kill, so this endpoint is claimed on the
* shared fetch handler instead, where the fence has already run.
*
* **The kill must not swallow the completion notice.** `JobRegistry.kill`
* marks the record `reported`, and `dsh-tool-jobs` suppresses its completion
* notice for a reported job. A human stop therefore has to say so itself, or
* the model keeps believing the job is still running — the exact gap the
* upstream design note (`2026-08-08-web-background-job-display`) deferred this
* feature over. This plugin injects its own plugin-sourced notice after a
* successful kill.
*
* **A job that settles inside the race window still gets an account.** The
* handler reads the job, then kills it. If the job reaches a terminal state in
* between, `kill` takes its already-terminal branch — which *also* claims
* `reported` — and returns `already-finished`. Announcing only on `requested`
* would leave that job announced by nobody at all: the exact failure the
* previous paragraph exists to prevent, reintroduced through a race. So the
* `already-finished` path re-reads and speaks when the record is terminal,
* while staying silent for a job that is merely `stopping` (whoever asked for
* that stop already knows).
*
* **The account is bounded like the one it replaces.** A producer may declare
* `outputLimitBytes` as its model-facing cap, and `dsh-tool-jobs` bounds its
* own completion notice to it; this plugin respects the same cap, clipping the
* producer's label — the only unbounded part — and keeping the job id and the
* `job_output` pointer, because an account whose reader cannot find the output
* is not worth sending. Delivery is bounded too: `maxConsecutiveWakes` mirrors
* tool-jobs' budget so a burst of stops cannot spend a model request each.
* @module @gorban/dsh-job-stop
*/
/** Internal Cordis name; the published package name is the module specifier. */
const name = "job-stop";
/** Required services: the registry, the owner lookup, and the fenced route host. */
const inject = [
	"jobs",
	"agents",
	"connection"
];
/**
* The reason recorded on the job and forwarded to its producer. Kept in
* English and stable so it greps in logs and in a job's terminal `detail`.
*/
const STOP_REASON = "stopped by the user from the background-job list";
/** Shared byte counter for the model-facing cap; stateless, so one instance. */
const encoder = new TextEncoder();
/** Validated configuration; the Loader resolves the defaults. */
const Config = z.object({
	notice: z.union([z.const("wakeup"), z.const("quiet")]).default("wakeup"),
	maxConsecutiveWakes: z.number().min(1).default(3)
});
/**
* Claim the stop endpoint, and the wake budget that bounds its notices.
* @param ctx - host context carrying the job registry, agent registry, and Connection.
* @param config - resolved plugin configuration.
*/
function apply(ctx, config) {
	const spentWakes = /* @__PURE__ */ new WeakMap();
	ctx.effect(() => ctx.on("agent/inbox/claimed", ({ agent, message }) => {
		if (message.source.kind === "user") spentWakes.delete(agent);
	}), "job-stop: wake budget refill");
	ctx.effect(() => ctx.connection.fetch.register({
		path: JOB_STOP_PATH,
		methods: ["POST"],
		requestBody: "buffered",
		fetch: (request) => handleStop(ctx, config, spentWakes, request)
	}), "job-stop: stop route");
}
/**
* Stop one background job on behalf of the browser.
*
* Only the request *shape* is a transport error; every business refusal is a
* `200` envelope so the browser half can localize it.
* @param ctx - host context owning the registries.
* @param config - resolved plugin configuration.
* @param spentWakes - this plugin's per-owner wake budget.
* @param request - the authenticated POST.
* @returns the JSON envelope for this attempt.
*/
async function handleStop(ctx, config, spentWakes, request) {
	if (request.method !== "POST") {
		const body = failure("invalid-request", "POST is required");
		return new Response(JSON.stringify(body), {
			status: 405,
			headers: {
				allow: "POST",
				"content-type": "application/json; charset=utf-8",
				"cache-control": "no-store"
			}
		});
	}
	const body = await readJson(request);
	if (body === void 0) return jobStopJson(failure("invalid-request", "a JSON request body is required"), 400);
	const parsed = parseRequest(body);
	if (parsed === void 0) return jobStopJson(failure("invalid-request", "sessionId and jobId must be non-empty strings"), 400);
	const agent = ctx.agents.get(SessionId(parsed.sessionId));
	if (agent === void 0) return jobStopJson(failure("no-live-session", "the Session has no live Agent to own this kill"), 409);
	const id = JobId(parsed.jobId);
	const snapshot = safeGet(ctx, id, agent);
	if (snapshot === void 0) return jobStopJson(failure("job-not-found", "no such background job for this Session"), 404);
	if (snapshot.status !== "running") return jobStopJson({
		ok: true,
		result: "already-finished"
	});
	let outcome;
	try {
		outcome = ctx.jobs.kill(id, agent, STOP_REASON);
	} catch (error) {
		return jobStopJson(failure("kill-failed", messageOf(error)), 502);
	}
	if (outcome === "requested") {
		announceStop(config, spentWakes, agent, snapshot);
		return jobStopJson({
			ok: true,
			result: outcome
		});
	}
	const settled = safeGet(ctx, id, agent);
	if (settled !== void 0 && settled.status !== "running" && settled.status !== "stopping") announceSettled(config, spentWakes, agent, settled);
	return jobStopJson({
		ok: true,
		result: outcome
	});
}
/**
* Tell the owning agent that a human stopped its job.
*
* `kill` already marked the record reported, so `dsh-tool-jobs` will not
* deliver its own completion notice for this job. Without this account the
* model would keep treating the job as running.
* @param config - resolved plugin configuration.
* @param spentWakes - this plugin's per-owner wake budget.
* @param agent - the exact live owner the registry authorized.
* @param job - the snapshot taken before the kill.
*/
function announceStop(config, spentWakes, agent, job) {
	deliver(config, spentWakes, agent, {
		head: `The user stopped background job ${job.id} (${job.kind}: `,
		label: job.label,
		tail: `) from the job list after ${describeElapsed(Date.now() - job.startedAt)}, so it was cancelled before finishing. Its partial output is still available through job_output("${job.id}").`,
		summary: `the user stopped ${job.id} (${job.kind})`,
		maxBytes: job.outputLimitBytes
	});
}
/**
* Tell the owning agent that its job ended on its own while the human was
* asking to stop it.
*
* `kill` claimed `reported` on that terminal record, so `dsh-tool-jobs` stayed
* quiet; this account is the only one the model will get.
* @param config - resolved plugin configuration.
* @param spentWakes - this plugin's per-owner wake budget.
* @param agent - the exact live owner the registry authorized.
* @param job - the terminal snapshot read after the kill.
*/
function announceSettled(config, spentWakes, agent, job) {
	deliver(config, spentWakes, agent, {
		head: `Background job ${job.id} (${job.kind}: `,
		label: job.label,
		tail: `) had already finished (${job.status}) when the user asked to stop it from the job list, so nothing was cancelled. Its output is available through job_output("${job.id}").`,
		summary: `${job.id} had already finished (${job.status})`,
		maxBytes: job.outputLimitBytes
	});
}
/**
* Build one bounded plugin notice and hand it to the owner under the configured
* delivery policy.
* @param config - resolved plugin configuration.
* @param spentWakes - this plugin's per-owner wake budget.
* @param agent - the owning agent.
* @param account - the account to deliver.
*/
function deliver(config, spentWakes, agent, account) {
	const message = createUserMessage({
		content: [{
			type: "text",
			text: fitNotice(account)
		}],
		source: {
			kind: "plugin",
			plugin: "job-stop",
			form: "notice",
			summary: boundContextSummary(account.summary)
		}
	});
	const spent = spentWakes.get(agent) ?? 0;
	if (config.notice === "wakeup" && agent.status === "idle" && spent < config.maxConsecutiveWakes) {
		spentWakes.set(agent, spent + 1);
		agent.followup(message);
		return;
	}
	agent.inject(message);
}
/**
* Render one account, clipping only the label when the producer declared a cap.
* @param account - the account to render.
* @returns the notice text, at most `maxBytes` bytes when a cap exists.
*/
function fitNotice(account) {
	const complete = `${account.head}${account.label}${account.tail}`;
	const maxBytes = account.maxBytes;
	if (maxBytes === void 0 || encoder.encode(complete).byteLength <= maxBytes) return complete;
	const omitted = " [label truncated]";
	const fixed = `${account.head}${omitted}${account.tail}`;
	const room = maxBytes - encoder.encode(fixed).byteLength;
	if (room <= 0) return truncateToBytes(`${account.head}${account.tail}`, maxBytes);
	return `${account.head}${truncateToBytes(account.label, room)}${omitted}${account.tail}`;
}
/**
* Clip text to a UTF-8 byte budget without splitting a code point.
* @param text - the text to clip.
* @param maxBytes - the byte budget.
* @returns the longest prefix within the budget.
*/
function truncateToBytes(text, maxBytes) {
	if (encoder.encode(text).byteLength <= maxBytes) return text;
	let low = 0;
	let high = text.length;
	while (low < high) {
		const mid = Math.ceil((low + high) / 2);
		if (encoder.encode(text.slice(0, mid)).byteLength <= maxBytes) low = mid;
		else high = mid - 1;
	}
	return text.slice(0, low);
}
/**
* Compact duration for a model-facing account: `42s`, `5m 3s`, `2h 7m`. Wider
* units stay coarse because the figure is orientation, not a measurement.
* @param elapsedMs - milliseconds the job had been running.
* @returns the duration phrase.
*/
function describeElapsed(elapsedMs) {
	const total = Math.max(0, Math.floor(elapsedMs / 1e3));
	const seconds = total % 60;
	const minutes = Math.floor(total / 60) % 60;
	const hours = Math.floor(total / 3600);
	if (hours > 0) return `${hours}h ${minutes}m`;
	if (minutes > 0) return `${minutes}m ${seconds}s`;
	return `${seconds}s`;
}
/**
* Read one job without consuming it, treating an unknown or foreign id as
* absent rather than as a throw.
* @param ctx - host context owning the registry.
* @param id - the job to read.
* @param agent - the caller the registry fences access against.
* @returns the snapshot, or undefined when this Session cannot see the job.
*/
function safeGet(ctx, id, agent) {
	try {
		return ctx.jobs.get(id, agent);
	} catch {
		return;
	}
}
/** Read a JSON body, treating a malformed one as absent rather than as a throw. */
async function readJson(request) {
	try {
		return await request.json();
	} catch {
		return;
	}
}
/** Validate the two required fields without trusting anything else on the body. */
function parseRequest(body) {
	if (typeof body !== "object" || body === null) return void 0;
	const candidate = body;
	if (typeof candidate.sessionId !== "string" || candidate.sessionId === "") return void 0;
	if (typeof candidate.jobId !== "string" || candidate.jobId === "") return void 0;
	return {
		sessionId: candidate.sessionId,
		jobId: candidate.jobId
	};
}
/** One refusal envelope. */
function failure(code, message) {
	return {
		ok: false,
		error: {
			code,
			message
		}
	};
}
/** Explain a caught value without leaking a stack to the wire. */
function messageOf(error) {
	return error instanceof Error ? error.message : String(error);
}
//#endregion
export { Config, apply, inject, name };
