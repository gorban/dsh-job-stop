/**
 * Host half of `@gorban/dsh-job-stop`.
 *
 * The web client's background-job list is a read-only projection of
 * `ctx.jobs`, so the only way to stop a job used to be the model's `job_kill`
 * tool. This plugin adds the human's path: one authenticated route the browser
 * half posts to, which fences the kill against the Session's exact live Agent
 * and then tells that Agent what happened.
 *
 * Two decisions are worth recording, because both were mistakes waiting to be
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
 * @module @gorban/dsh-job-stop
 */

import z from '@deepseek-ai/schemastery'
import { boundContextSummary, createUserMessage } from '@deepseek-ai/dsh-llm'
import { JobId } from '@deepseek-ai/dsh-jobs'
import { SessionId } from '@deepseek-ai/dsh-session'
import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-client-connection'
import {
  JOB_STOP_PATH,
  jobStopJson,
  type JobStopErrorCode,
  type JobStopRequest,
  type JobStopResponse,
} from './protocol.ts'

/** Internal Cordis name; the published package name is the module specifier. */
export const name = 'job-stop'

/** Required services: the registry, the owner lookup, and the fenced route host. */
export const inject = ['jobs', 'agents', 'connection']

/**
 * The reason recorded on the job and forwarded to its producer. Kept in
 * English and stable so it greps in logs and in a job's terminal `detail`.
 */
const STOP_REASON = 'stopped by the user from the background-job list'

/** Plugin configuration. */
export interface Config {
  /**
   * How the owning agent learns about the stop. `wakeup` opens a turn on an
   * idle agent (one model request, and the same default `dsh-tool-jobs` ships
   * for its own completion notices); `quiet` leaves the account pending until
   * something else wakes the agent.
   */
  readonly notice: 'wakeup' | 'quiet'
}

/** Validated configuration; the Loader resolves the default. */
export const Config: z<Config> = z.object({
  notice: z.union([z.const('wakeup'), z.const('quiet')]).default('wakeup'),
})

/**
 * Claim the stop endpoint for the lifetime of this plugin row.
 * @param ctx - host context carrying the job registry, agent registry, and Connection.
 * @param config - resolved plugin configuration.
 */
export function apply(ctx: Context, config: Config): void {
  ctx.effect(
    () => ctx.connection.fetch.register({
      path: JOB_STOP_PATH,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: request => handleStop(ctx, config, request),
    }),
    'job-stop: stop route',
  )
}

/**
 * Stop one background job on behalf of the browser.
 *
 * Only the request *shape* is a transport error; every business refusal is a
 * `200` envelope so the browser half can localize it.
 * @param ctx - host context owning the registries.
 * @param config - resolved plugin configuration.
 * @param request - the authenticated POST.
 * @returns the JSON envelope for this attempt.
 */
async function handleStop(ctx: Context, config: Config, request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    const body = failure('invalid-request', 'POST is required')
    return new Response(JSON.stringify(body), {
      status: 405,
      headers: {
        allow: 'POST',
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      },
    })
  }
  const body = await readJson(request)
  if (body === undefined) {
    return jobStopJson(failure('invalid-request', 'a JSON request body is required'), 400)
  }
  const parsed = parseRequest(body)
  if (parsed === undefined) {
    return jobStopJson(failure('invalid-request', 'sessionId and jobId must be non-empty strings'), 400)
  }

  // Ids are predictable, so authorization — not secrecy — is the boundary: the
  // kill is fenced by the Session's exact live Agent, never by the id alone.
  const agent = ctx.agents.get(SessionId(parsed.sessionId))
  if (agent === undefined) {
    return jobStopJson(failure('no-live-session', 'the Session has no live Agent to own this kill'), 409)
  }

  const id = JobId(parsed.jobId)
  let snapshot
  try {
    // `get` is the non-consuming read. `read` would consume the job's single
    // output cursor and silently take bytes the model's `job_output` will never
    // see — the one thing a web path must never do to this registry.
    snapshot = ctx.jobs.get(id, agent)
  } catch {
    return jobStopJson(failure('job-not-found', 'no such background job for this Session'), 404)
  }

  // Never call `kill` on a job that already left `running`: that path sets
  // `reported` on the terminal record and would suppress the completion notice
  // the model is still owed. A job already stopping needs no second request.
  if (snapshot.status !== 'running') {
    return jobStopJson({ ok: true, result: 'already-finished' })
  }

  let outcome
  try {
    outcome = ctx.jobs.kill(id, agent, STOP_REASON)
  } catch (error: unknown) {
    // A producer throw propagates without changing job state, so the job is
    // still live and the caller may retry.
    return jobStopJson(failure('kill-failed', messageOf(error)), 502)
  }
  if (outcome === 'requested') announceStop(config, agent, snapshot)
  return jobStopJson({ ok: true, result: outcome })
}

/** The subset of the terminal snapshot a notice needs. */
interface StoppedJob {
  readonly id: string
  readonly kind: string
  readonly label: string
}

/**
 * Tell the owning agent that a human stopped its job.
 *
 * `kill` already marked the record reported, so `dsh-tool-jobs` will not
 * deliver its own completion notice for this job. Without this account the
 * model would keep treating the job as running.
 * @param config - resolved plugin configuration.
 * @param agent - the exact live owner the registry authorized.
 * @param job - the snapshot taken before the kill.
 */
function announceStop(config: Config, agent: Agent, job: StoppedJob): void {
  const message = createUserMessage({
    content: [{
      type: 'text',
      text: `The user stopped background job ${job.id} (${job.kind}: ${job.label}) from the job list, so it was cancelled before finishing. `
        + `Its partial output is still available through job_output("${job.id}").`,
    }],
    source: {
      kind: 'plugin',
      plugin: 'job-stop',
      form: 'notice',
      summary: boundContextSummary(`the user stopped ${job.id} (${job.kind})`),
    },
  })
  if (config.notice === 'wakeup' && agent.status === 'idle') {
    agent.followup(message)
    return
  }
  agent.inject(message)
}

/** Read a JSON body, treating a malformed one as absent rather than as a throw. */
async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return undefined
  }
}

/** Validate the two required fields without trusting anything else on the body. */
function parseRequest(body: unknown): JobStopRequest | undefined {
  if (typeof body !== 'object' || body === null) return undefined
  const candidate = body as { readonly sessionId?: unknown; readonly jobId?: unknown }
  if (typeof candidate.sessionId !== 'string' || candidate.sessionId === '') return undefined
  if (typeof candidate.jobId !== 'string' || candidate.jobId === '') return undefined
  return { sessionId: candidate.sessionId, jobId: candidate.jobId }
}

/** One refusal envelope. */
function failure(code: JobStopErrorCode, message: string): JobStopResponse {
  return { ok: false, error: { code, message } }
}

/** Explain a caught value without leaking a stack to the wire. */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
