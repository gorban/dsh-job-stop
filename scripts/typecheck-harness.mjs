#!/usr/bin/env node
/**
 * Typecheck this plugin's sources against a real dsh checkout.
 *
 * The published `@deepseek-ai/*` rc packages on npm lag the running harness —
 * they predate the `jobsBySession` mirror and the slot contract this plugin
 * targets — so the plugin is written against the harness's own sources and
 * verified by pointing TypeScript at a checkout instead of at node_modules.
 *
 * The generated config carries machine paths, so it is written into this repo
 * (gitignored) rather than committed.
 *
 * Including the harness sources also pulls in the harness's own vendor code,
 * which does not typecheck as a guest of this project (schemastery's sources
 * predate `exactOptionalPropertyTypes`). Those diagnostics are printed as a
 * note; only errors inside this repo's `src/` fail the run.
 *
 * Usage:
 *   DSH_CHECKOUT=/path/to/deepseek-harness node scripts/typecheck-harness.mjs
 */

import { spawnSync } from 'node:child_process'
import { existsSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CONFIG = join(ROOT, 'tsconfig.harness.json')

const checkout = process.env.DSH_CHECKOUT
if (checkout === undefined || checkout === '') {
  console.error('DSH_CHECKOUT is required: point it at a deepseek-harness checkout.')
  process.exit(2)
}
const base = resolve(checkout)
const baseConfig = join(base, 'tsconfig.base.json')
if (!existsSync(baseConfig)) {
  console.error(`No tsconfig.base.json under ${base}: is that a deepseek-harness checkout?`)
  process.exit(2)
}

// The harness base config is `composite`, which requires every reachable file to
// be listed; disabling it here is what lets one project span both trees.
const config = {
  extends: baseConfig,
  compilerOptions: {
    baseUrl: base,
    jsx: 'react-jsx',
    noEmit: true,
    composite: false,
    incremental: false,
    declaration: false,
    declarationMap: false,
    sourceMap: false,
    types: [],
  },
  include: [
    join(ROOT, 'src/**/*'),
    join(base, 'packages/**/src/**/*'),
  ],
}

writeFileSync(CONFIG, `${JSON.stringify(config, null, 2)}\n`)
console.log(`Typechecking against ${base} ...`)

const result = spawnSync(join(ROOT, 'node_modules/.bin/tsc'), ['-p', CONFIG, '--pretty', 'false'], {
  encoding: 'utf8',
})
const output = `${result.stdout ?? ''}${result.stderr ?? ''}`

// tsc prints paths relative to the config's own directory, which is ROOT.
const lines = output.split('\n').filter(line => line !== '')
const isDiagnostic = (line) => /^\S+\(\d+,\d+\): error TS/.test(line)
const pluginErrors = []
const harnessErrors = []
for (const line of lines) {
  if (!isDiagnostic(line)) continue
  const file = line.slice(0, line.indexOf('('))
  const absolute = resolve(ROOT, file)
  const insideRepo = absolute === ROOT || absolute.startsWith(`${ROOT}${sep}`)
  ;(insideRepo ? pluginErrors : harnessErrors).push(line)
}

if (pluginErrors.length > 0) {
  console.error(`\n${pluginErrors.length} error(s) in this plugin:\n`)
  for (const line of pluginErrors) console.error(line)
  process.exit(1)
}

if (harnessErrors.length > 0) {
  console.log(
    `\nNote: ${harnessErrors.length} diagnostic(s) inside the harness checkout itself.`
    + ' The harness typechecks its packages one project at a time with per-package'
    + ' settings, so guesting them all into one project reports its own noise; none of'
    + ' it is this plugin, and none of it fails this run.',
  )
  for (const line of harnessErrors.slice(0, 3)) console.log(`  e.g. ${line}`)
}
console.log(`\nNo errors in ${join(ROOT, 'src')}.`)
