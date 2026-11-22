import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Card, Category } from './types'

export type Focus = 'all' | Category | 'mistakes'

interface CardStat {
  seen: number
  right: number
}

/** A missed card stays in the mistakes pile until it has been answered right twice per miss. */
interface Mistake {
  count: number
  fixed: number
}

interface TrainerState {
  focus: Focus
  /** Move on by itself after a correct answer (choice and typed cards). */
  autoAdvance: boolean
  combo: number
  best: number
  stats: Record<string, CardStat>
  mistakes: Record<string, Mistake>
  /** Recently shown ids, newest last, so cards don't repeat back to back. Not persisted. */
  recent: string[]

  setFocus: (f: Focus) => void
  setAutoAdvance: (on: boolean) => void
  record: (id: string, correct: boolean) => void
  resetProgress: () => void
}

export const useTrainer = create<TrainerState>()(
  persist(
    (set, get) => ({
      focus: 'all',
      autoAdvance: true,
      combo: 0,
      best: 0,
      stats: {},
      mistakes: {},
      recent: [],

      setFocus: (focus) => set({ focus }),
      setAutoAdvance: (autoAdvance) => set({ autoAdvance }),

      record: (id, correct) => {
        const s = get()
        const st = s.stats[id] ?? { seen: 0, right: 0 }
        const stats = { ...s.stats, [id]: { seen: st.seen + 1, right: st.right + (correct ? 1 : 0) } }
        const mistakes = { ...s.mistakes }
        const m = mistakes[id]
        if (!correct) mistakes[id] = { count: (m?.count ?? 0) + 1, fixed: m?.fixed ?? 0 }
        else if (m) {
          if (m.fixed + 1 >= m.count * 2) delete mistakes[id]
          else mistakes[id] = { ...m, fixed: m.fixed + 1 }
        }
        const combo = correct ? s.combo + 1 : 0
        set({ stats, mistakes, combo, best: Math.max(s.best, combo) })
      },

      resetProgress: () => set({ combo: 0, best: 0, stats: {}, mistakes: {}, recent: [] })
    }),
    {
      name: 'trainer.v1',
      partialize: ({ focus, autoAdvance, combo, best, stats, mistakes }) => ({ focus, autoAdvance, combo, best, stats, mistakes })
    }
  )
)

export function poolFor(cards: Card[], focus: Focus, mistakes: Record<string, Mistake>): Card[] {
  if (focus === 'all') return cards
  if (focus === 'mistakes') return cards.filter((c) => mistakes[c.id])
  return cards.filter((c) => c.cat === focus)
}

/**
 * Weighted pick: cards you've missed come up most, unseen ones next, ones you keep getting right
 * least. The last few shown are skipped when the pool is big enough.
 */
export function pickCard(pool: Card[], state: Pick<TrainerState, 'stats' | 'mistakes' | 'recent'>, exclude?: string): Card | null {
  if (!pool.length) return null
  const avoid = new Set(state.recent.slice(-Math.min(8, Math.floor(pool.length / 2))))
  if (exclude) avoid.add(exclude)
  let candidates = pool.filter((c) => !avoid.has(c.id))
  if (!candidates.length) candidates = pool.filter((c) => c.id !== exclude)
  if (!candidates.length) candidates = pool
  const weight = (c: Card): number => {
    const m = state.mistakes[c.id]
    if (m) return 4 + Math.max(0, m.count * 2 - m.fixed)
    const st = state.stats[c.id]
    if (!st) return 3
    return Math.max(0.4, 1.5 - st.right * 0.25)
  }
  const weights = candidates.map(weight)
  let x = Math.random() * weights.reduce((a, b) => a + b, 0)
  for (let i = 0; i < candidates.length; i++) {
    x -= weights[i]
    if (x <= 0) return candidates[i]
  }
  return candidates[candidates.length - 1]
}

export function markShown(id: string): void {
  const recent = [...useTrainer.getState().recent, id].slice(-16)
  useTrainer.setState({ recent })
}
