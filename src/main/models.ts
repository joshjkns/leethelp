// The models each provider offers, for the pickers in Settings and the assistant. Both lists come
// from the installed CLIs and are cached for a few minutes; opening a picker refreshes them.
import type { ModelCatalog, ModelChoice, ModelOption, ProviderInfo } from '@shared/types'
import { app } from 'electron'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { findClaude, findCodex, type Shell } from './cli'
import * as codex from './codex'

const CLAUDE_EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max']

export const CLAUDE_MODELS: ModelOption[] = [
  { id: 'claude-fable-5-2', label: 'Fable 5.2', description: 'Most capable, for the hardest problems', efforts: CLAUDE_EFFORTS, defaultEffort: 'high' },
  { id: 'claude-opus-5-5', label: 'Opus 5.5', description: 'Smart and quick, the default', efforts: CLAUDE_EFFORTS, defaultEffort: 'medium' },
  { id: 'claude-sonnet-5-5', label: 'Sonnet 5.5', description: 'Fast everyday coaching', efforts: CLAUDE_EFFORTS, defaultEffort: 'medium' },
  { id: 'claude-haiku-5-5', label: 'Haiku 5.5', description: 'Fastest, for quick questions', efforts: CLAUDE_EFFORTS, defaultEffort: 'medium' }
]

let claudeCache: { at: number; list: ModelOption[] } | null = null

/**
 * The models your installed Claude Code offers, asked of the CLI through the Agent SDK (no turn
 * runs, so it costs nothing). Rows are keyed by their full model id, so saved settings stay exact
 * and also work with an API key. Falls back to the built-in list if the CLI can't be asked.
 */
async function claudeModels(cli: Shell, refresh: boolean): Promise<ModelOption[]> {
  if (!refresh && claudeCache && Date.now() - claudeCache.at < 10 * 60_000) return claudeCache.list
  const { query } = await import('@anthropic-ai/claude-agent-sdk')
  const cwd = join(app.getPath('userData'), 'assistant')
  await mkdir(cwd, { recursive: true })
  // A prompt that never yields: the session only answers control requests, then closes.
  const idle = (async function* () {
    await new Promise(() => {})
  })() as AsyncIterable<never>
  const q = query({
    prompt: idle,
    options: { tools: [], settingSources: [], cwd, pathToClaudeCodeExecutable: cli.bin, env: { ...process.env, PATH: cli.path } }
  })
  try {
    const rows = await Promise.race([
      q.supportedModels(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timed out')), 15_000))
    ])
    const seen = new Set<string>()
    const list: ModelOption[] = []
    for (const r of rows) {
      // "Default" duplicates one of the named rows.
      if (r.value === 'default') continue
      const id = r.resolvedModel ?? r.value
      if (seen.has(id)) continue
      seen.add(id)
      const efforts = r.supportsEffort === false ? [] : (r.supportedEffortLevels ?? CLAUDE_EFFORTS)
      const known = CLAUDE_MODELS.find((m) => m.id === id)
      list.push({
        id,
        label: r.displayName,
        description: r.description,
        efforts,
        legacy: !known,
        defaultEffort: known && efforts.includes(known.defaultEffort) ? known.defaultEffort : efforts.includes('medium') ? 'medium' : (efforts[0] ?? '')
      })
    }
    if (!list.length) return CLAUDE_MODELS
    // Strongest first, like the built-in list.
    const rank = (id: string): number => {
      const i = CLAUDE_MODELS.findIndex((m) => m.id === id)
      return i < 0 ? CLAUDE_MODELS.length : i
    }
    list.sort((a, b) => rank(a.id) - rank(b.id))
    claudeCache = { at: Date.now(), list }
    return list
  } catch {
    return claudeCache?.list ?? CLAUDE_MODELS
  } finally {
    q.close()
  }
}

async function claudeInfo(refresh: boolean): Promise<ProviderInfo> {
  const cli = await findClaude()
  return { id: 'claude', label: 'Claude', installed: !!cli, signedIn: null, models: cli ? await claudeModels(cli, refresh) : CLAUDE_MODELS }
}

async function codexInfo(refresh: boolean): Promise<ProviderInfo> {
  const base: ProviderInfo = { id: 'codex', label: 'Codex', installed: !!(await findCodex()), signedIn: null, models: [] }
  if (!base.installed) return base
  try {
    const [list, signedIn] = await Promise.all([codex.listModels(refresh), codex.signedIn()])
    const models = list.map((m) => ({
      id: m.model,
      label: m.displayName,
      description: m.description,
      efforts: m.supportedReasoningEfforts.map((e) => e.reasoningEffort),
      defaultEffort: m.defaultReasoningEffort,
      legacy: !m.isDefault && /\blegacy\b/i.test(m.description)
    }))
    // Codex's default model first.
    const def = list.findIndex((m) => m.isDefault)
    if (def > 0) models.unshift(...models.splice(def, 1))
    return { ...base, signedIn, models }
  } catch (e) {
    return { ...base, error: (e as Error).message }
  }
}

export async function catalog(refresh = false): Promise<ModelCatalog> {
  const [claude, codexP] = await Promise.all([claudeInfo(refresh), codexInfo(refresh)])
  return { claude, codex: codexP }
}

/** A saved choice made valid: an unknown model falls back to the provider's first, and the effort to one it supports. */
export async function resolve(choice: ModelChoice): Promise<ModelChoice> {
  const models = (choice.provider === 'claude' ? await claudeInfo(false) : await codexInfo(false)).models
  const m = models.find((x) => x.id === choice.model) ?? models[0]
  if (!m) return choice
  const effort = !m.efforts.length ? '' : m.efforts.includes(choice.effort) ? choice.effort : m.defaultEffort
  return { provider: choice.provider, model: m.id, effort }
}
