/**
 * The session-header background-job list, with a human stop affordance.
 *
 * This component shadows the built-in `job-list` entry (same cell id, lower
 * priority) rather than adding a second header control: the list is the only
 * place a job's command is legible, so it is where a stop belongs.
 *
 * Hovering a *running* row covers its animated state dot with a stop button
 * (tooltip, accessible name, localized); activating it opens the house
 * confirmation dialog — the same `Modal` + `Button` composition the session
 * rename and workspace delete dialogs use — restating the full command, kind,
 * status, elapsed time, and job id before anything is cancelled.
 * @module @gorban/dsh-job-stop/client/JobStopAction
 */

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import type { SessionJob as JobView } from '@deepseek-ai/dsh-api-session-controller/types'
import {
  Button,
  IconChevronDownOutline14,
  IconStopFill16,
  Modal,
  StateDot,
  Tooltip,
  useDismissOnOutsidePointer,
  type StateDotState,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime, TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import {
  JOB_STOP_PATH,
  type JobStopErrorCode,
  type JobStopResponse,
} from '../protocol.ts'
import { NS, type JobStopKey } from './locales.ts'
import css from './JobStopAction.module.css'

/** Full props for the session-header background-job action. */
export type JobStopActionProps =
  PropsRuntime<'conversation.session.header.actions'> & PropsLocale<typeof NS>

/** Stable empty list so a session with no jobs keeps one array identity. */
const NO_JOBS: readonly JobView[] = []

/** A job the registry still holds open, and whose duration therefore ticks. */
function isLive(job: JobView): boolean {
  return job.status === 'running' || job.status === 'stopping'
}

/** Closed-union exhaustiveness fence for the wire status set. */
/* v8 ignore next 3 -- closed-union backstop; only reached if a status is forged */
function assertNever(value: never): never {
  throw new Error(`unhandled job status: ${JSON.stringify(value)}`)
}

/**
 * Status marker semantics. `stopping` and `killed` share the attention color:
 * both mean the work ended (or is ending) on request rather than on its own.
 */
function dotState(status: JobView['status']): StateDotState {
  switch (status) {
    case 'running': return 'ongoing'
    case 'stopping': return 'warning'
    case 'completed': return 'done'
    case 'killed': return 'warning'
    case 'failed': return 'error'
    /* v8 ignore next -- closed wire status union */
    default: return assertNever(status)
  }
}

/** Human status word for the row, the dialog, and their accessible names. */
function statusLabel(status: JobView['status'], t: TranslateNS<typeof NS>): string {
  switch (status) {
    case 'running': return t('status.running')
    case 'stopping': return t('status.stopping')
    case 'completed': return t('status.completed')
    case 'killed': return t('status.killed')
    case 'failed': return t('status.failed')
    /* v8 ignore next -- closed wire status union */
    default: return assertNever(status)
  }
}

/**
 * Elapsed time in at most two adjacent units. A background job that outlives
 * an hour is already exceptional, so hours is the widest unit.
 */
function formatDuration(elapsedMs: number, t: TranslateNS<typeof NS>): string {
  const total = Math.max(0, Math.floor(elapsedMs / 1_000))
  const seconds = total % 60
  const minutes = Math.floor(total / 60) % 60
  const hours = Math.floor(total / 3_600)
  if (hours > 0) return t('duration.hours', { hours, minutes })
  if (minutes > 0) return t('duration.minutes', { minutes, seconds })
  return t('duration.seconds', { seconds })
}

/**
 * Live rows first in start order, then settled rows newest-first, with a
 * same-millisecond tie broken on start order so the sort never depends on the
 * host's map iteration.
 */
function ordered(jobs: readonly JobView[]): JobView[] {
  return [...jobs].sort((left, right) => {
    const liveLeft = isLive(left)
    if (liveLeft !== isLive(right)) return liveLeft ? -1 : 1
    if (liveLeft) return left.startedAt - right.startedAt
    const finished = (right.finishedAt ?? right.startedAt) - (left.finishedAt ?? left.startedAt)
    return finished !== 0 ? finished : left.startedAt - right.startedAt
  })
}

/** Map a host refusal onto the copy that explains it. */
function errorKey(code: JobStopErrorCode): JobStopKey {
  switch (code) {
    case 'invalid-request': return 'error.invalid-request'
    case 'no-live-session': return 'error.no-live-session'
    case 'job-not-found': return 'error.job-not-found'
    case 'kill-failed': return 'error.kill-failed'
    case 'unreachable': return 'error.unreachable'
    // The host may grow codes this build has never seen; never crash on one.
    default: return 'error.unknown'
  }
}

/** Explain a caught value without assuming it is an `Error`. */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** Accept only the plugin's own envelope, so a proxy error page is a failure. */
function isJobStopResponse(value: unknown): value is JobStopResponse {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as { readonly ok?: unknown; readonly result?: unknown; readonly error?: unknown }
  if (candidate.ok === true) {
    return candidate.result === 'requested' || candidate.result === 'already-finished'
  }
  if (candidate.ok !== false) return false
  const error = candidate.error
  if (typeof error !== 'object' || error === null) return false
  return typeof (error as { readonly code?: unknown }).code === 'string'
}

/**
 * Ask the host to stop one job. The carrier is the authenticated Connection
 * fetch route, so the trust fence has already run by the time the host sees it.
 * @param sessionId - the owning session, as the header slot received it.
 * @param jobId - the registry id published in the list.
 * @returns the host envelope, or an `unreachable` refusal.
 */
async function stopJob(sessionId: string, jobId: string): Promise<JobStopResponse> {
  let response: Response
  try {
    response = await fetch(JOB_STOP_PATH, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sessionId, jobId }),
    })
  } catch (error: unknown) {
    return { ok: false, error: { code: 'unreachable', message: messageOf(error) } }
  }
  let body: unknown
  try {
    body = await response.json()
  } catch {
    body = undefined
  }
  if (isJobStopResponse(body)) return body
  return { ok: false, error: { code: 'unreachable', message: `HTTP ${response.status}` } }
}

/**
 * Session-header entry point for this session's background jobs.
 * @param props - runtime slot currency plus the namespace translator.
 * @returns the trigger, its popover list, and the stop confirmation, or null
 *   when the session has no jobs at all.
 */
export function JobStopAction({ sessionId, useSessions, t }: JobStopActionProps) {
  const jobs = useSessions(state => state.jobsBySession[sessionId]) ?? NO_JOBS
  const [open, setOpen] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  // The dialog target is a snapshot plus the instant it was opened, so the
  // elapsed figure it shows cannot drift with the popover's ticking clock.
  const [target, setTarget] = useState<{ readonly job: JobView; readonly at: number } | null>(null)
  const [stopping, setStopping] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const rows = useMemo(() => ordered(jobs), [jobs])
  const liveCount = useMemo(() => jobs.filter(isLive).length, [jobs])

  useDismissOnOutsidePointer(rootRef, open, setOpen)

  // The clock only runs while an open list is showing something that moves.
  useEffect(() => {
    if (!open || liveCount === 0) return
    setNow(Date.now())
    const timer = setInterval(() => { setNow(Date.now()) }, 1_000)
    return () => { clearInterval(timer) }
  }, [open, liveCount])

  // The last job disappearing removes this control; close first so focus does
  // not vanish from an unmounting node.
  useEffect(() => {
    if (jobs.length === 0 && open) setOpen(false)
  }, [jobs.length, open])

  if (jobs.length === 0) return null

  const countKey = liveCount > 0
    ? (liveCount === 1 ? 'count.live.one' : 'count.live.other')
    : (jobs.length === 1 ? 'count.idle.one' : 'count.idle.other')
  const countLabel = t(countKey, { count: liveCount > 0 ? liveCount : jobs.length })

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key !== 'Escape' || !open) return
    event.preventDefault()
    setOpen(false)
    triggerRef.current?.focus()
  }

  const openConfirm = (job: JobView): void => {
    // The list closes so the dialog is the only thing on screen; the snapshot
    // it carries is what the dialog restates.
    setOpen(false)
    setError(null)
    setTarget({ job, at: Date.now() })
  }

  const closeConfirm = (): void => {
    if (stopping) return
    setTarget(null)
    setError(null)
  }

  const confirmStop = (): void => {
    if (target === null || stopping) return
    setStopping(true)
    setError(null)
    void stopJob(sessionId, target.job.id).then((result) => {
      setStopping(false)
      // `already-finished` is success: the job is no longer running either way.
      if (result.ok) {
        setTarget(null)
        return
      }
      setError(t(errorKey(result.error.code), { message: result.error.message }))
    })
  }

  return (
    <div ref={rootRef} className={css.root} onKeyDown={onKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        className={css.trigger}
        aria-expanded={open}
        aria-label={countLabel}
        onClick={() => {
          // Sample the clock in the same commit that opens the list: the
          // mount-time value predates every job.
          setNow(Date.now())
          setOpen(current => !current)
        }}
      >
        {liveCount > 0 ? <StateDot state="ongoing" className={css.triggerDot} /> : null}
        <span className={css.count}>{countLabel}</span>
        <IconChevronDownOutline14 className={open ? css.triggerOpen : undefined} />
      </button>
      {open
        ? (
          <ul className={css.menu} aria-label={t('list.aria')}>
            {rows.map((job) => {
              const live = isLive(job)
              const elapsed = live ? now - job.startedAt : (job.finishedAt ?? job.startedAt) - job.startedAt
              const duration = formatDuration(elapsed, t)
              const status = statusLabel(job.status, t)
              return (
                <li key={job.id} className={live ? css.row : `${css.row} ${css.rowSettled}`}>
                  <span className={css.dotSlot}>
                    <StateDot state={dotState(job.status)} className={css.rowDot} />
                    {job.status === 'running'
                      ? (
                        <Tooltip label={t('stop.tooltip')} side="top">
                          <button
                            type="button"
                            className={css.stopButton}
                            aria-label={t('stop.aria', { label: job.label })}
                            onClick={() => { openConfirm(job) }}
                          >
                            <IconStopFill16 size={12} />
                          </button>
                        </Tooltip>
                      )
                      : null}
                  </span>
                  <span className={css.kind}>{job.kind}</span>
                  <span className={css.label} title={job.label}>{job.label}</span>
                  <span className={css.status} title={job.detail ?? status}>{job.detail ?? status}</span>
                  <span
                    className={css.duration}
                    title={t(live ? 'duration.title.live' : 'duration.title.done', { duration })}
                  >
                    {duration}
                  </span>
                </li>
              )
            })}
          </ul>
        )
        : null}
      <Modal
        open={target !== null}
        onClose={closeConfirm}
        closeLabel={t('close')}
        title={t('confirm.title')}
        footer={(
          <>
            <Button variant="outline" disabled={stopping} onClick={closeConfirm}>{t('cancel')}</Button>
            <Button
              variant="outline"
              className={css.confirmAction}
              disabled={stopping}
              onClick={confirmStop}
            >
              {t('confirm.action')}
            </Button>
          </>
        )}
      >
        {target === null
          ? null
          : (
            <>
              <p className={css.lead}>{t('confirm.lead')}</p>
              <dl className={css.details}>
                <dt className={css.term}>{t('field.command')}</dt>
                <dd className={css.command}>{target.job.label}</dd>
                <dt className={css.term}>{t('field.kind')}</dt>
                <dd className={css.value}>{target.job.kind}</dd>
                <dt className={css.term}>{t('field.status')}</dt>
                <dd className={css.value}>{statusLabel(target.job.status, t)}</dd>
                <dt className={css.term}>{t('field.elapsed')}</dt>
                <dd className={css.value}>{formatDuration(target.at - target.job.startedAt, t)}</dd>
                <dt className={css.term}>{t('field.id')}</dt>
                <dd className={css.mono}>{target.job.id}</dd>
              </dl>
              {error !== null && <div className={css.error} role="alert">{error}</div>}
            </>
          )}
      </Modal>
    </div>
  )
}
