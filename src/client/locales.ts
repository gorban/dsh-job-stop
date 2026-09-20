/**
 * `jobStop` namespace dictionaries.
 *
 * The count/status/duration keys deliberately repeat the built-in `job`
 * namespace's copy instead of borrowing it: this plugin shadows that plugin's
 * list entry, and reading another package's private dictionary keys would make
 * an upstream copy change break this control silently. One small duplication
 * buys an independent release cycle.
 * @module @gorban/dsh-job-stop/client/locales
 */

/** Dictionary namespace owned by this plugin. */
export const NS = 'jobStop'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'count.live.one': '{count} 个后台任务运行中',
  'count.live.other': '{count} 个后台任务运行中',
  'count.idle.one': '{count} 个后台任务',
  'count.idle.other': '{count} 个后台任务',
  'list.aria': '后台任务',
  'status.running': '运行中',
  'status.stopping': '正在停止',
  'status.completed': '已完成',
  'status.killed': '已取消',
  'status.failed': '已失败',
  'duration.seconds': '{seconds}秒',
  'duration.minutes': '{minutes}分{seconds}秒',
  'duration.hours': '{hours}小时{minutes}分',
  'duration.title.live': '已运行 {duration}',
  'duration.title.done': '耗时 {duration}',
  'stop.tooltip': '停止这个后台任务',
  'stop.aria': '停止后台任务：{label}',
  'confirm.title': '停止这个后台任务？',
  'confirm.lead': '将立即终止该任务，尚未完成的工作会丢失。',
  'confirm.action': '停止任务',
  'field.command': '命令',
  'field.kind': '类型',
  'field.status': '状态',
  'field.elapsed': '已运行',
  'field.id': '任务 ID',
  'cancel': '取消',
  'close': '关闭',
  'error.invalid-request': '停止请求无效，已被拒绝。',
  'error.no-live-session': '该会话没有运行中的 agent，无法停止它的后台任务。',
  'error.job-not-found': '该后台任务已不存在。',
  'error.kill-failed': '停止任务失败：{message}',
  'error.unreachable': '无法连接主机：{message}',
  'error.unknown': '停止任务失败：{message}',
} as const

/** English dictionary, key-identical to the Chinese source of truth. */
export const en: Record<JobStopKey, string> = {
  'count.live.one': '{count} background job running',
  'count.live.other': '{count} background jobs running',
  'count.idle.one': '{count} background job',
  'count.idle.other': '{count} background jobs',
  'list.aria': 'Background jobs',
  'status.running': 'running',
  'status.stopping': 'stopping',
  'status.completed': 'completed',
  'status.killed': 'cancelled',
  'status.failed': 'failed',
  'duration.seconds': '{seconds}s',
  'duration.minutes': '{minutes}m {seconds}s',
  'duration.hours': '{hours}h {minutes}m',
  'duration.title.live': 'Running for {duration}',
  'duration.title.done': 'Took {duration}',
  'stop.tooltip': 'Stop this background job',
  'stop.aria': 'Stop background job: {label}',
  'confirm.title': 'Stop this background job?',
  'confirm.lead': 'This cancels the job immediately. Work in progress is lost.',
  'confirm.action': 'Stop job',
  'field.command': 'Command',
  'field.kind': 'Kind',
  'field.status': 'Status',
  'field.elapsed': 'Elapsed',
  'field.id': 'Job id',
  'cancel': 'Cancel',
  'close': 'Close',
  'error.invalid-request': 'The stop request was malformed and was rejected.',
  'error.no-live-session': 'This session has no running agent, so its background jobs cannot be stopped.',
  'error.job-not-found': 'That background job no longer exists.',
  'error.kill-failed': 'Could not stop the job: {message}',
  'error.unreachable': 'Could not reach the host: {message}',
  'error.unknown': 'Could not stop the job: {message}',
}

/** Key domain of the `jobStop` namespace (zh is the source of truth). */
export type JobStopKey = keyof typeof zh
