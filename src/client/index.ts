/**
 * Browser half of `@gorban/dsh-job-stop`.
 *
 * It contributes one entry to `conversation.session.header.actions` under the
 * built-in list's own cell id (`job-list`) at a lower priority. List cells are
 * keyed by id and the render read takes the lowest-priority live entry per
 * cell, so this entry *shadows* the read-only list instead of sitting beside
 * it: the header keeps exactly one background-job control, and no upstream row
 * is left rendering behind it.
 *
 * Nothing here talks to the job registry directly — the browser cannot. Job
 * state still arrives through the `jobsBySession` mirror, and the stop itself
 * is one authenticated POST handled by this package's host half.
 * @module @gorban/dsh-job-stop/client
 */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { JobStopAction } from './JobStopAction.tsx'
import { en, NS, zh, type JobStopKey } from './locales.ts'

export type { JobStopActionProps } from './JobStopAction.tsx'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Background-job list copy, including the stop confirmation. */
    jobStop: JobStopKey
  }
}

/** Required services: the Session mirror, the slot registry, and copy. */
export const inject = ['sessions', 'slots', 'locale']

/**
 * Client plugin body: register the dictionaries and the header action.
 * @param ctx - client root context.
 */
export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'job-stop: dictionaries')
  ctx.slots.inject(
    'conversation.session.header.actions',
    () => ctx.slots.register({
      name: 'conversation.session.header.actions',
      // The built-in entry's own cell id: same cell, lower priority, so this
      // registration wins and the read-only list is shadowed rather than
      // duplicated in the header.
      id: 'job-list',
      priority: -1,
      locale: NS,
    }, JobStopAction),
  )
}
