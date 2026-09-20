import { clientBundle } from './build/tsdown.client.ts'

// The id is the plugin id (package name): the client build stamps it into
// `window.__ModuleLoader__.load({ id, factory })`, and the browser module
// system rejects a bundle that does not register the id it was served under
// ("loaded without registering \"<id>\""). It must therefore be the published
// scoped name, while the internal Cordis `export const name` stays `job-stop`.
const ID = '@gorban/dsh-job-stop'

export default clientBundle(ID, ['src/index.ts'], {
  portableCssModuleIds: true,
  // Harness-provided packages resolve at runtime from the dsh installation, so
  // they stay external and this plugin pins itself to no harness build. Its
  // only dependencies are these; nothing third-party is bundled.
  libExternal: [
    '@deepseek-ai/dsh-jobs',
    '@deepseek-ai/dsh-session',
    '@deepseek-ai/dsh-llm',
    '@deepseek-ai/dsh-client-connection',
    '@deepseek-ai/schemastery',
  ],
})
