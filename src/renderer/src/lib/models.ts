// The providers and models the pickers offer, fetched from the main process (which asks the
// installed CLIs) and refreshed whenever a picker opens.
import { create } from 'zustand'
import type { ModelCatalog, ModelChoice, ModelOption, Provider } from '@shared/types'

interface State {
  catalog: ModelCatalog | null
  loading: boolean
  load: (refresh?: boolean) => Promise<void>
}

let inflight: Promise<void> | null = null

export const useModels = create<State>()((set) => ({
  catalog: null,
  loading: false,
  load: (refresh = false) =>
    (inflight ??= (async () => {
      set({ loading: true })
      try {
        set({ catalog: await window.api.getModels(refresh) })
      } catch {
        // keep what we had
      } finally {
        set({ loading: false })
        inflight = null
      }
    })())
}))

export const PROVIDERS: { id: Provider; label: string; install: string; url: string }[] = [
  { id: 'claude', label: 'Claude', install: 'Install Claude Code, then run `claude` once to sign in.', url: 'https://claude.com/claude-code' },
  { id: 'codex', label: 'Codex', install: 'Install the Codex CLI, then run `codex` once to sign in.', url: 'https://developers.openai.com/codex/cli' }
]

const EFFORT_LABEL: Record<string, string> = {
  none: 'None',
  minimal: 'Minimal',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  xhigh: 'Extra high',
  max: 'Max',
  ultra: 'Ultra'
}
export const effortLabel = (e: string): string => EFFORT_LABEL[e] ?? e.charAt(0).toUpperCase() + e.slice(1)

/** Short names for models when the catalog hasn't loaded yet (or doesn't list a saved model). */
function fallbackLabel(id: string): string {
  const m = /^claude-([a-z]+)-(\d+)(?:-(\d+))?$/.exec(id)
  if (m) return `${m[1].charAt(0).toUpperCase()}${m[1].slice(1)} ${m[2]}${m[3] ? `.${m[3]}` : ''}`
  return id.replace(/^gpt-/i, 'GPT-')
}

export function findModel(catalog: ModelCatalog | null, choice: ModelChoice): ModelOption | undefined {
  return catalog?.[choice.provider].models.find((m) => m.id === choice.model)
}

export const modelLabel = (catalog: ModelCatalog | null, choice: ModelChoice): string =>
  findModel(catalog, choice)?.label ?? fallbackLabel(choice.model)

/** A choice moved to another model: keep the effort if the new model has it, else use its default. */
export function withModel(provider: Provider, m: ModelOption, prev: ModelChoice): ModelChoice {
  return { provider, model: m.id, effort: !m.efforts.length ? '' : m.efforts.includes(prev.effort) ? prev.effort : m.defaultEffort }
}
