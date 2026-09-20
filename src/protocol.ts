/**
 * The one wire contract shared by this plugin's host and browser halves.
 *
 * It deliberately imports nothing: the browser half inlines this module into
 * the client bundle, so it must stay free of host-only packages.
 * @module @gorban/dsh-job-stop/protocol
 */

/** The exact authenticated route the browser half posts to. */
export const JOB_STOP_PATH = '/api/dsh-job-stop/kill'

/** Request body: which Session's job to stop. */
export interface JobStopRequest {
  /** Owning Session; the host fences the kill against its live Agent. */
  readonly sessionId: string
  /** Registry-issued `<kind>-N` id, as published in the job list. */
  readonly jobId: string
}

/** `requested` for live work; `already-finished` when it settled on its own. */
export type JobStopOutcome = 'requested' | 'already-finished'

/**
 * Business failures are ordinary results, not transport errors, so the browser
 * half can render a localized explanation for each one.
 */
export type JobStopErrorCode =
  | 'invalid-request'
  | 'no-live-session'
  | 'job-not-found'
  | 'kill-failed'
  | 'unreachable'

/** One machine-readable refusal. */
export interface JobStopFailure {
  readonly code: JobStopErrorCode
  readonly message: string
}

/** The response envelope every exit path uses, including refusals. */
export type JobStopResponse =
  | { readonly ok: true; readonly result: JobStopOutcome }
  | { readonly ok: false; readonly error: JobStopFailure }

/** Build one JSON response with the plugin's no-store posture. */
export function jobStopJson(body: JobStopResponse, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}
