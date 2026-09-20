/**
 * Host-half behavior tests for @gorban/dsh-job-stop.
 *
 * They drive the built plugin against a stand-in registry rather than a live
 * harness, so they run anywhere the pinned harness packages install. The
 * behaviors pinned here are the ones that are easy to get subtly wrong:
 *
 * - the endpoint is claimed on the Connection fetch registry (behind the trust
 *   fence), with the declared method and body mode;
 * - a kill is fenced by the Session's live Agent, never by the job id alone;
 * - a job that already left `running` is reported `already-finished` *without*
 *   calling `kill`, because that path would set `reported` and suppress the
 *   completion notice the model is still owed;
 * - a requested kill always produces exactly one model-facing notice, and
 *   `notice: 'quiet'` injects instead of waking an idle agent;
 * - a job that settles between the read and the kill is still announced, while
 *   one that was already stopping stays silent;
 * - the notice respects a producer's `outputLimitBytes` cap without losing the
 *   job id or the `job_output` pointer;
 * - the wake budget bounds opened turns and is refilled only by human input.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { apply, inject, name } from '../lib/index.js'

const PATH = '/api/dsh-job-stop/kill'
const SESSION = 'session-a'

/** One stand-in registry recording every call it receives. */
function fakeRegistry(jobs) {
  const calls = []
  return {
    calls,
    get(id, agent) {
      calls.push(['get', id, agent])
      const job = jobs.get(id)
      if (job === undefined) throw new Error(`unknown job ${id}`)
      return job
    },
    kill(id, agent, reason) {
      calls.push(['kill', id, agent, reason])
      const job = jobs.get(id)
      if (job === undefined) throw new Error(`unknown job ${id}`)
      if (job.status !== 'running') {
        job.reported = true
        return 'already-finished'
      }
      job.status = 'stopping'
      job.reported = true
      return 'requested'
    },
  }
}

/** One stand-in agent recording how a notice reached it. */
function fakeAgent(status = 'idle') {
  const delivered = []
  return {
    delivered,
    status,
    inject: message => delivered.push(['inject', message]),
    followup: message => delivered.push(['followup', message]),
  }
}

/**
 * Boot the plugin against stand-ins.
 * @returns the registered route and a delivery helper for host events.
 */
function boot({ jobs, agents, config = { notice: 'wakeup', maxConsecutiveWakes: 3 } }) {
  let route
  const listeners = new Map()
  const ctx = {
    jobs,
    agents,
    connection: { fetch: { register: registered => { route = registered; return () => {} } } },
    effect: (factory) => { factory(); return () => {} },
    on: (event, listener) => {
      listeners.set(event, [...listeners.get(event) ?? [], listener])
      return () => {}
    },
  }
  apply(ctx, config)
  assert.ok(route, 'apply() must claim exactly one Connection fetch route')
  return {
    route,
    /** Deliver one host event to the listeners this boot registered. */
    emit: (event, payload) => { for (const listener of listeners.get(event) ?? []) listener(payload) },
  }
}

/** Post one JSON body to the registered route. */
function post(route, body, init = {}) {
  return route.fetch(new Request(`http://localhost${PATH}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
    ...init,
  }))
}

/** A running bash job with the full command as its label. */
function runningJob() {
  return {
    id: 'bash-1',
    kind: 'bash',
    label: 'npm run build --workspace packages/web',
    status: 'running',
    startedAt: Date.now() - 60_000,
    reported: false,
  }
}

test('the plugin keeps its unscoped internal Cordis name', () => {
  assert.equal(name, 'job-stop')
})

test('injects the registries and the Connection route host', () => {
  assert.deepEqual([...inject], ['jobs', 'agents', 'connection'])
})

test('claims an authenticated POST route on the Connection fetch registry', () => {
  const { route } = boot({ jobs: fakeRegistry(new Map()), agents: { get: () => undefined } })
  assert.equal(route.path, PATH)
  assert.deepEqual([...route.methods], ['POST'])
  assert.equal(route.requestBody, 'buffered')
})

test('stops a running job and tells an idle owner about it', async () => {
  const jobs = new Map([['bash-1', runningJob()]])
  const registry = fakeRegistry(jobs)
  const agent = fakeAgent('idle')
  const { route } = boot({ jobs: registry, agents: { get: id => (id === SESSION ? agent : undefined) } })

  const response = await post(route, { sessionId: SESSION, jobId: 'bash-1' })
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { ok: true, result: 'requested' })

  assert.equal(jobs.get('bash-1').status, 'stopping')
  const kill = registry.calls.find(call => call[0] === 'kill')
  assert.ok(kill, 'a running job must be killed through the registry')
  assert.equal(kill[1], 'bash-1')
  assert.equal(kill[2], agent, 'the kill is fenced by the exact live owner Agent')
  assert.match(kill[3], /stopped by the user/)

  assert.equal(agent.delivered.length, 1, 'exactly one notice is delivered')
  const [channel, message] = agent.delivered[0]
  assert.equal(channel, 'followup', 'an idle owner is woken, matching dsh-tool-jobs')
  assert.equal(message.source.kind, 'plugin')
  assert.equal(message.source.plugin, 'job-stop')
  assert.equal(message.source.form, 'notice')
  assert.ok(message.source.summary.length <= 120)
  const text = message.content.map(block => block.text).join('')
  assert.match(text, /bash-1/)
  assert.match(text, /npm run build --workspace packages\/web/)
})

test('quiet delivery injects without opening a turn', async () => {
  const agent = fakeAgent('idle')
  const { route } = boot({
    jobs: fakeRegistry(new Map([['bash-1', runningJob()]])),
    agents: { get: () => agent },
    config: { notice: 'quiet' },
  })

  await post(route, { sessionId: SESSION, jobId: 'bash-1' })
  assert.equal(agent.delivered.length, 1)
  assert.equal(agent.delivered[0][0], 'inject')
})

test('a busy owner is injected even under wakeup delivery', async () => {
  const agent = fakeAgent('running')
  const { route } = boot({
    jobs: fakeRegistry(new Map([['bash-1', runningJob()]])),
    agents: { get: () => agent },
  })

  await post(route, { sessionId: SESSION, jobId: 'bash-1' })
  assert.equal(agent.delivered[0][0], 'inject')
})

test('a job that already left running is reported without calling kill', async () => {
  for (const status of ['stopping', 'completed', 'killed', 'failed']) {
    const job = { ...runningJob(), status, reported: false }
    const registry = fakeRegistry(new Map([['bash-1', job]]))
    const agent = fakeAgent()
    const { route } = boot({ jobs: registry, agents: { get: () => agent } })

    const response = await post(route, { sessionId: SESSION, jobId: 'bash-1' })
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { ok: true, result: 'already-finished' })

    assert.equal(
      registry.calls.some(call => call[0] === 'kill'),
      false,
      `kill must not run for a ${status} job: it would set reported and swallow the model's notice`,
    )
    assert.equal(job.reported, false, 'the notice state must be left alone')
    assert.equal(agent.delivered.length, 0)
  }
})

test('refuses a job the registry does not hold for this Session', async () => {
  const agent = fakeAgent()
  const { route } = boot({ jobs: fakeRegistry(new Map()), agents: { get: () => agent } })

  const response = await post(route, { sessionId: SESSION, jobId: 'bash-9' })
  assert.equal(response.status, 404)
  assert.deepEqual(await response.json(), {
    ok: false,
    error: { code: 'job-not-found', message: 'no such background job for this Session' },
  })
  assert.equal(agent.delivered.length, 0)
})

test('refuses when the Session has no live Agent', async () => {
  const registry = fakeRegistry(new Map([['bash-1', runningJob()]]))
  const { route } = boot({ jobs: registry, agents: { get: () => undefined } })

  const response = await post(route, { sessionId: 'session-gone', jobId: 'bash-1' })
  assert.equal(response.status, 409)
  assert.equal((await response.json()).error.code, 'no-live-session')
  assert.equal(registry.calls.length, 0, 'nothing is read or killed before the fence passes')
})

test('rejects malformed and incomplete requests', async () => {
  const { route } = boot({ jobs: fakeRegistry(new Map()), agents: { get: () => fakeAgent() } })

  assert.equal((await post(route, 'not json')).status, 400)
  assert.equal((await post(route, {})).status, 400)
  assert.equal((await post(route, { sessionId: SESSION })).status, 400)
  assert.equal((await post(route, { sessionId: '', jobId: 'bash-1' })).status, 400)
  assert.equal((await post(route, { sessionId: SESSION, jobId: 42 })).status, 400)

  const bad = await post(route, { sessionId: SESSION })
  assert.equal((await bad.json()).error.code, 'invalid-request')
})

test('rejects a non-POST method and advertises the one it allows', async () => {
  const { route } = boot({ jobs: fakeRegistry(new Map()), agents: { get: () => fakeAgent() } })
  const response = await route.fetch(new Request(`http://localhost${PATH}`, { method: 'GET' }))
  assert.equal(response.status, 405)
  assert.equal(response.headers.get('allow'), 'POST')
  assert.equal((await response.json()).error.code, 'invalid-request')
})

test('reports a producer failure without claiming the job stopped', async () => {
  const job = runningJob()
  const registry = fakeRegistry(new Map([['bash-1', job]]))
  registry.kill = () => { throw new Error('producer refused to cancel') }
  const agent = fakeAgent()
  const { route } = boot({ jobs: registry, agents: { get: () => agent } })

  const response = await post(route, { sessionId: SESSION, jobId: 'bash-1' })
  assert.equal(response.status, 502)
  assert.equal((await response.json()).error.code, 'kill-failed')
  assert.equal(agent.delivered.length, 0, 'no notice is sent for a kill that did not happen')
})

test('answers with a no-store JSON envelope', async () => {
  const { route } = boot({ jobs: fakeRegistry(new Map([['bash-1', runningJob()]])), agents: { get: () => fakeAgent() } })
  const response = await post(route, { sessionId: SESSION, jobId: 'bash-1' })
  assert.match(response.headers.get('content-type'), /application\/json/)
  assert.equal(response.headers.get('cache-control'), 'no-store')
})

test('announces a job that settled between the read and the kill', async () => {
  // The handler reads the job, then kills it. If the job finishes inside that
  // window, kill() takes its already-terminal branch — which also claims
  // `reported` — so dsh-tool-jobs stays quiet and nobody else would speak.
  const job = runningJob()
  const registry = fakeRegistry(new Map([['bash-1', job]]))
  const agent = fakeAgent('idle')
  const { route } = boot({ jobs: registry, agents: { get: () => agent } })

  const realKill = registry.kill
  registry.kill = (id, caller, reason) => {
    job.status = 'completed'
    return realKill(id, caller, reason)
  }

  const response = await post(route, { sessionId: SESSION, jobId: 'bash-1' })
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { ok: true, result: 'already-finished' })

  assert.equal(agent.delivered.length, 1, 'the settled job must still be announced')
  const text = agent.delivered[0][1].content.map(block => block.text).join('')
  assert.match(text, /had already finished \(completed\)/)
  assert.match(text, /job_output\("bash-1"\)/)
})

test('stays silent when the job was already stopping', async () => {
  // Its killer owns the account; a second notice would be noise.
  const job = { ...runningJob(), status: 'stopping' }
  const registry = fakeRegistry(new Map([['bash-1', job]]))
  const agent = fakeAgent()
  const { route } = boot({ jobs: registry, agents: { get: () => agent } })

  await post(route, { sessionId: SESSION, jobId: 'bash-1' })
  assert.equal(registry.calls.some(call => call[0] === 'kill'), false)
  assert.equal(agent.delivered.length, 0)
})

test('bounds the notice to the producer model-facing cap', async () => {
  const longLabel = `npm run build ${'--workspace packages/web '.repeat(40)}`
  const job = { ...runningJob(), label: longLabel, outputLimitBytes: 400 }
  const agent = fakeAgent()
  const { route } = boot({ jobs: fakeRegistry(new Map([['bash-1', job]])), agents: { get: () => agent } })

  await post(route, { sessionId: SESSION, jobId: 'bash-1' })
  assert.equal(agent.delivered.length, 1)
  const text = agent.delivered[0][1].content.map(block => block.text).join('')
  assert.ok(new TextEncoder().encode(text).byteLength <= 400, `notice exceeded the cap: ${text}`)
  assert.match(text, /bash-1/, 'the job id must survive the clip')
  assert.match(text, /job_output\("bash-1"\)/, 'the pointer must survive the clip')
  assert.match(text, /label truncated/)
  assert.ok(!text.includes(longLabel), 'the oversized label must be clipped')
})

test('a cap too small for the fixed frame still names the job', async () => {
  const job = { ...runningJob(), label: 'x'.repeat(5_000), outputLimitBytes: 64 }
  const agent = fakeAgent()
  const { route } = boot({ jobs: fakeRegistry(new Map([['bash-1', job]])), agents: { get: () => agent } })

  await post(route, { sessionId: SESSION, jobId: 'bash-1' })
  const text = agent.delivered[0][1].content.map(block => block.text).join('')
  assert.ok(new TextEncoder().encode(text).byteLength <= 64)
  assert.match(text, /bash-1/)
})

test('does not clip when the producer declares no cap', async () => {
  const longLabel = `npm run build ${'--workspace packages/web '.repeat(40)}`
  const job = { ...runningJob(), label: longLabel }
  const agent = fakeAgent()
  const { route } = boot({ jobs: fakeRegistry(new Map([['bash-1', job]])), agents: { get: () => agent } })

  await post(route, { sessionId: SESSION, jobId: 'bash-1' })
  const text = agent.delivered[0][1].content.map(block => block.text).join('')
  assert.ok(text.includes(longLabel), 'a producer without a cap keeps its full label')
})

test('spends the wake budget, then injects', async () => {
  const jobs = new Map([
    ['bash-1', runningJob()],
    ['bash-2', { ...runningJob(), id: 'bash-2' }],
    ['bash-3', { ...runningJob(), id: 'bash-3' }],
  ])
  const agent = fakeAgent('idle')
  const { route } = boot({
    jobs: fakeRegistry(jobs),
    agents: { get: () => agent },
    config: { notice: 'wakeup', maxConsecutiveWakes: 2 },
  })

  for (const id of ['bash-1', 'bash-2', 'bash-3']) await post(route, { sessionId: SESSION, jobId: id })
  assert.deepEqual(agent.delivered.map(entry => entry[0]), ['followup', 'followup', 'inject'])
})

test('human input refills the wake budget', async () => {
  const jobs = new Map([
    ['bash-1', runningJob()],
    ['bash-2', { ...runningJob(), id: 'bash-2' }],
  ])
  const agent = fakeAgent('idle')
  const { route, emit } = boot({
    jobs: fakeRegistry(jobs),
    agents: { get: () => agent },
    config: { notice: 'wakeup', maxConsecutiveWakes: 1 },
  })

  await post(route, { sessionId: SESSION, jobId: 'bash-1' })
  emit('agent/inbox/claimed', { agent, message: { source: { kind: 'user' } } })
  await post(route, { sessionId: SESSION, jobId: 'bash-2' })
  assert.deepEqual(agent.delivered.map(entry => entry[0]), ['followup', 'followup'])
})

test('a plugin-sourced inbox claim does not refill the budget', async () => {
  const jobs = new Map([
    ['bash-1', runningJob()],
    ['bash-2', { ...runningJob(), id: 'bash-2' }],
  ])
  const agent = fakeAgent('idle')
  const { route, emit } = boot({
    jobs: fakeRegistry(jobs),
    agents: { get: () => agent },
    config: { notice: 'wakeup', maxConsecutiveWakes: 1 },
  })

  await post(route, { sessionId: SESSION, jobId: 'bash-1' })
  emit('agent/inbox/claimed', { agent, message: { source: { kind: 'plugin' } } })
  await post(route, { sessionId: SESSION, jobId: 'bash-2' })
  assert.deepEqual(agent.delivered.map(entry => entry[0]), ['followup', 'inject'])
})

test('includes how long the job had been running', async () => {
  const job = { ...runningJob(), startedAt: Date.now() - 300_000 }
  const agent = fakeAgent()
  const { route } = boot({ jobs: fakeRegistry(new Map([['bash-1', job]])), agents: { get: () => agent } })

  await post(route, { sessionId: SESSION, jobId: 'bash-1' })
  const text = agent.delivered[0][1].content.map(block => block.text).join('')
  assert.match(text, /after 5m \d+s/)
})
