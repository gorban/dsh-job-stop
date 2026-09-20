# @gorban/dsh-job-stop

[![npm](https://img.shields.io/npm/v/@gorban/dsh-job-stop)](https://www.npmjs.com/package/@gorban/dsh-job-stop)
[![license](https://img.shields.io/npm/l/@gorban/dsh-job-stop)](LICENSE)
![dsh](https://img.shields.io/badge/dsh-%3E%3D0.1.2--alpha.1-blue)

Stop a running background job from the DeepSeek Harness web session header — hover its row in the background-job list, click the stop sign, confirm in a dialog that restates the full command.

## What it does

The session header's background-job list becomes actionable for the human, not just readable:

- **Hover a running row** and the animated state dot is covered by a red stop button, with a tooltip and an accessible name that both name the job (`Stop background job: <command>`).
- **Activate it** and the house confirmation dialog opens — the same `Modal` + `Button` composition the session rename and workspace delete dialogs use — restating **the full command**, the job kind, its status, how long it had been running, and its registry id before anything is cancelled.
- **Confirm** and the host kills the job through `ctx.jobs`, the row flips to `stopping` and then `killed` from the ordinary pushed frame, and the owning agent is told that a human stopped its job.

Everything is localized (English and Simplified Chinese) and keyboard reachable: the stop button takes focus and reveals itself on `:focus-visible`, Escape closes the dialog, and `prefers-reduced-motion` disables the fades.

## Why it exists

`ctx.jobs` already ran every background `bash`/`pwsh`/PTY/subagent job, and `dsh-tool-jobs` already exposed `job_kill` — to the *model*. The web list (`dsh-client-ui-jobs`) was a deliberately read-only projection, and its own README named the reason cancellation was deferred:

> **Rows are read-only** — … Cancellation additionally owes a model-facing decision the seam does not answer: `kill()` marks terminal delivery reported, so an interrupt written against the current contract would leave the model believing its job is still running.

That is the whole problem this plugin solves, and the design note `2026-08-08-web-background-job-display` left `stopping` in the wire union precisely so this phase would not need a wire change. Two consequences shape the implementation:

1. **The model must be told.** `JobRegistry.kill` sets `reported = true`, and `dsh-tool-jobs` skips its completion notice for a reported job. So after a successful kill this plugin injects its own plugin-sourced notice (`inject` while the agent is busy, `followup` when it is idle and `notice: wakeup`), or the model would keep waiting on a job that no longer exists.
2. **A job that already ended must not be killed.** Calling `kill` on a terminal record also sets `reported`, which would swallow the completion notice the model is still owed. So the endpoint reports `already-finished` *without* calling `kill` whenever the job has left `running`.

## Install

**From npm** — prebuilt, so the install needs no build step and no `allowBuilds` approval:

```sh
dsh plugin --profile web add @gorban/dsh-job-stop
```

**From GitHub** — no npm account involved:

```sh
dsh plugin --profile web add github:gorban/dsh-job-stop
```

**From a release tarball** — for a host that cannot reach npm or a GitHub source archive:

```sh
dsh plugin --profile web add https://github.com/gorban/dsh-job-stop/releases/latest/download/dsh-job-stop.tgz
```

Then restart `dsh` (a plugin row is mounted at profile load). The command adds the dependency and, because `package.json` declares `dsh.bundle`, lists the package in `dsh.profile.bundles` so its `cordis.patch.yml` row is applied.

**Requires dsh `0.1.2-alpha.1` or newer**, declared as `engines.dsh` so the Plugin Market's host-aware filter can read it: both the `jobsBySession` mirror this list renders from and the `ctx.connection.fetch` route seam the stop endpoint is claimed on first shipped in that release.

The shipped `@deepseek-ai/dsh-client-ui-jobs` row can stay enabled: this plugin registers its list under that entry's own slot cell id (`job-list`) at a lower priority, so the header keeps exactly one control and the read-only list is shadowed rather than duplicated. This plugin also renders correctly with that row disabled, because it reads the same `jobsBySession` mirror.

## How it works

**Host half** (`src/index.ts`) claims one authenticated route on the Connection fetch registry:

```ts
ctx.connection.fetch.register({
  path: '/api/dsh-job-stop/kill',
  methods: ['POST'],
  requestBody: 'buffered',
  fetch: request => handleStop(ctx, config, request),
})
```

That registry is deliberate, and it is not the obvious choice. `ctx.webServer.register({ kind: 'exact', path: '/api/...' })` — the pattern a plugin reaches for first — matches the web server's *exact* table before Connection's `/api` *prefix* route, so it runs **ahead** of `requestRejection` and therefore outside the host/Origin trust and browser-authentication fence. That is fine for a prompt toggle and wrong for a mutating kill, so this endpoint is claimed on the shared fetch handler instead, where the fence has already run.

The handler then:

- validates `{ sessionId, jobId }` and rejects malformed bodies (`400`);
- resolves the Session's exact live Agent with `ctx.agents.get(...)` and refuses when there is none (`409`) — ids are predictable, so authorization, not secrecy, is the boundary, and the registry fences `kill` by that Agent;
- reads the job with `ctx.jobs.get(...)`, **never** `ctx.jobs.read(...)`: `read` consumes the job's single output cursor and would silently take bytes the model's `job_output` will never see;
- reports `already-finished` for a job that has left `running`, otherwise calls `ctx.jobs.kill(...)` and, on `requested`, delivers the notice.

**Browser half** (`src/client/`) shadows the built-in list entry and adds the hover affordance. It talks to the registry only through that one POST; job state still arrives through the pushed `jobsBySession` mirror, so no polling or optimistic row state is involved.

## Configuration

```yaml
- id: job-stop
  name: "@gorban/dsh-job-stop"
  config:
    notice: wakeup   # or: quiet
```

| Option | Default | Meaning |
| --- | --- | --- |
| `notice` | `wakeup` | `wakeup` opens a turn on an idle owning agent so it learns immediately (one model request, the same default `dsh-tool-jobs` ships for its own completion notices). `quiet` leaves the account pending until something else wakes the agent. A busy agent is injected either way. |

## Requirements

Every dependency is provided by the dsh installation this plugin runs inside, and is resolved from the host's module graph — the plugin pins itself to no harness build:

| At runtime | Used for |
| --- | --- |
| `ctx.jobs`, `ctx.agents` | the registry and the owner fence |
| `ctx.connection.fetch` | the authenticated route (`@deepseek-ai/dsh-client-connection`) |
| `@deepseek-ai/dsh-jobs`, `dsh-session`, `dsh-llm`, `schemastery` | job/session ids, the identified notice message, config schema |
| `@deepseek-ai/dsh-client-ui-primitives`, `dsh-client-ui-slots`, `dsh-client-locale`, `dsh-client-ui-conversation`, React | the list, the dialog, and the slot contract |

These are deliberately **not** declared as `peerDependencies`. Declaring them makes a standalone `pnpm install` try to fetch harness packages from npm, and at least one published range currently resolves to a build whose tree depends on `@deepseek-ai/dsh-type-meta`, which is not on the public registry. The plugin therefore installs with no network resolution of harness code at all.

## Development

```sh
pnpm install
pnpm build      # host half -> lib/index.js, browser half -> lib/client.js
pnpm test       # builds, then runs the host-half behavior suite (node --test)
```

Both halves are built by `tsdown` through `build/tsdown.client.ts`, which emits the browser bundle as a `window.__ModuleLoader__.load({ id, factory })` closure whose id is this package's published name — the browser module system rejects a bundle that registers any other id.

### Releasing

```sh
npm version patch          # or minor/major; commits and tags
git push --follow-tags
```

Then publish a GitHub Release for the tag. That one action attaches the prebuilt `dsh-job-stop.tgz` asset (which the tarball install route above points at) and, once `NPM_PUBLISH_ENABLED` is set, publishes to npm. The release notes are what the Plugin Market shows for an update, so write them for users rather than as a commit log. `.github/workflows/release.yml` documents the npm trusted-publisher setup that has to exist once.

The client half is **not** typechecked by the build (the published rc packages on npm predate the slot contract and the `jobsBySession` mirror this plugin targets). To typecheck against a real checkout instead:

```sh
DSH_CHECKOUT=/path/to/deepseek-harness node scripts/typecheck-harness.mjs
```

That project spans the plugin and the harness sources and fails only on errors inside this repo's `src/`; the harness's own guest diagnostics are reported as a note. It is worth running after touching the slot registration or the host route, because those are the two places where a stale published type would hide a real mistake.

## Known limitations

- **Only `running` rows offer the stop affordance.** A `stopping` job is already ending; offering to stop it again would be a second request for the same outcome.
- **The dialog restates what the registry published.** For `bash` that is the complete command (`args.command`, untruncated), which is why the dialog is worth opening. A producer that publishes a truncated label gives the dialog only that.
- **A Session with no live Agent cannot have its jobs stopped** (`409`). The kill is fenced by that exact owner instance, and guessing one would be an authorization hole.
- **Stopping a job does not remove its `run_in_background` card** from the transcript; the card was never live-updating, and the list is where the outcome is legible.
- **The shadow depends on one cell id.** If upstream renames the `job-list` slot entry, this plugin's entry stops replacing it and both lists would render. The fix is a one-line id change here.
- **The recorded kill reason is a fixed English string** (`stopped by the user from the background-job list`), kept stable so it greps in logs and in a job's terminal `detail`; it is not user-facing copy.

## License

MIT
