// A client for `codex app-server`: your installed Codex CLI, with its own login, spoken to over
// JSON-RPC on stdio. One server process is shared by the assistant and problem generation; each
// conversation is a Codex thread, and the app's tools are registered on it as dynamic tools.
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { createInterface } from 'node:readline'
import { app } from 'electron'
import { findCodex } from './cli'

type Json = unknown
interface RpcMessage {
  id?: number | string
  method?: string
  params?: Record<string, unknown>
  result?: Json
  error?: { code: number; message: string }
}

/** Handles one thread's notifications and the server's requests for it (tool calls). */
export interface ThreadHandler {
  notify(method: string, params: Record<string, unknown>): void
  request?(method: string, params: Record<string, unknown>): Promise<Json>
}

/** Codex's own tools are switched off where it allows; the app's tools are the point. */
export const QUIET_CONFIG = {
  web_search: 'disabled',
  features: Object.fromEntries(
    ['shell_tool', 'unified_exec', 'view_image', 'image_generation', 'apps', 'plugins', 'multi_agent', 'browser_use', 'computer_use', 'in_app_browser', 'hooks', 'goals', 'skill_search', 'tool_suggest', 'memories'].map(
      (f) => [f, false]
    )
  )
}

class CodexServer {
  private proc: ChildProcessWithoutNullStreams
  private nextId = 1
  private pending = new Map<number, { resolve: (v: Json) => void; reject: (e: Error) => void }>()
  readonly threads = new Map<string, ThreadHandler>()
  readonly ready: Promise<void>
  private stderr = ''
  closed = false

  constructor(bin: string, path: string) {
    this.proc = spawn(bin, ['app-server'], {
      env: { ...process.env, PATH: path },
      // npm's codex.cmd shim on Windows needs a shell to run.
      shell: process.platform === 'win32' && /\.cmd$/i.test(bin),
      windowsHide: true
    })
    this.proc.stderr.on('data', (d) => (this.stderr = (this.stderr + d).slice(-2000)))
    createInterface({ input: this.proc.stdout }).on('line', (l) => this.onLine(l))
    const fail = (why: string): void => {
      if (this.closed) return
      this.closed = true
      const err = new Error(why)
      for (const p of this.pending.values()) p.reject(err)
      this.pending.clear()
      for (const h of this.threads.values()) h.notify('leethelp/closed', { message: why })
    }
    this.proc.on('error', (e) => fail(`Couldn’t start Codex: ${e.message}`))
    this.proc.on('exit', (code) => fail(`Codex stopped (exit ${code})${this.stderr.trim() ? `: ${this.stderr.trim().slice(-300)}` : ''}`))
    this.ready = this.request('initialize', {
      clientInfo: { name: 'leethelp', title: 'LeetHelp', version: app.getVersion() },
      // Dynamic tools are an experimental part of the protocol.
      capabilities: { experimentalApi: true }
    }).then(() => this.write({ method: 'initialized' }))
  }

  private write(m: RpcMessage): void {
    if (!this.closed) this.proc.stdin.write(JSON.stringify(m) + '\n')
  }

  request<T = Json>(method: string, params: unknown): Promise<T> {
    const id = this.nextId++
    return new Promise<T>((resolve, reject) => {
      if (this.closed) return reject(new Error('Codex isn’t running.'))
      this.pending.set(id, { resolve: resolve as (v: Json) => void, reject })
      this.write({ id, method, params: params as Record<string, unknown> })
    })
  }

  private onLine(line: string): void {
    let m: RpcMessage
    try {
      m = JSON.parse(line)
    } catch {
      return
    }
    // A response to one of our requests.
    if (m.id != null && !m.method) {
      const p = this.pending.get(Number(m.id))
      if (!p) return
      this.pending.delete(Number(m.id))
      if (m.error) p.reject(new Error(m.error.message))
      else p.resolve(m.result)
      return
    }
    const params = m.params ?? {}
    const handler = typeof params.threadId === 'string' ? this.threads.get(params.threadId) : undefined
    // A request from the server: tool calls go to the thread; anything asking for approval is declined.
    if (m.id != null && m.method) {
      const id = m.id
      const answer = handler?.request?.(m.method, params) ?? Promise.resolve(declined(m.method))
      answer.then(
        (result) => this.write({ id, result }),
        (e: Error) => this.write({ id, error: { code: -32000, message: e.message } })
      )
      return
    }
    if (m.method) handler?.notify(m.method, params)
  }

  kill(): void {
    this.closed = true
    this.proc.kill()
  }
}

/** What to answer a server request nobody handles: no to approvals, nothing for questions. */
export function declined(method: string): Json {
  if (method.endsWith('requestApproval') || method === 'execCommandApproval' || method === 'applyPatchApproval') return { decision: 'decline' }
  if (method === 'item/tool/requestUserInput') return { answers: {} }
  return {}
}

let server: CodexServer | null = null
let starting: Promise<CodexServer> | null = null

/** The shared app-server, started on first use and restarted if it died. */
export async function codex(): Promise<CodexServer> {
  if (server && !server.closed) return server
  starting ??= (async () => {
    try {
      const cli = await findCodex()
      if (!cli) throw new Error('Codex isn’t installed. Install the Codex CLI and run `codex` once to sign in, then try again.')
      const s = new CodexServer(cli.bin, cli.path)
      await s.ready
      server = s
      return s
    } finally {
      starting = null
    }
  })()
  return starting
}

export function shutdown(): void {
  server?.kill()
  server = null
}

// ── Models and account ──

export interface CodexModel {
  model: string
  displayName: string
  description: string
  hidden: boolean
  isDefault: boolean
  supportedReasoningEfforts: { reasoningEffort: string; description: string }[]
  defaultReasoningEffort: string
}

let models: { at: number; list: CodexModel[] } | null = null

export async function listModels(refresh = false): Promise<CodexModel[]> {
  if (!refresh && models && Date.now() - models.at < 10 * 60_000) return models.list
  const s = await codex()
  const list: CodexModel[] = []
  let cursor: string | null = null
  do {
    const r: { data: CodexModel[]; nextCursor: string | null } = await s.request('model/list', { cursor })
    list.push(...r.data)
    cursor = r.nextCursor
  } while (cursor)
  models = { at: Date.now(), list: list.filter((m) => !m.hidden) }
  return models.list
}

/** Whether Codex has a usable login (ChatGPT or API key). */
export async function signedIn(): Promise<boolean> {
  const s = await codex()
  const r = await s.request<{ account: unknown | null; requiresOpenaiAuth?: boolean }>('account/read', { refreshToken: false })
  return !!r.account || r.requiresOpenaiAuth === false
}
