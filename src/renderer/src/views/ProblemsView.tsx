import { useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ArrowDownUp, CheckCircle2, CircleDashed, Lock, Network, RefreshCw, Search, X } from 'lucide-react'
import { useApp } from '@/lib/store'
import { cn } from '@/lib/utils'
import type { Difficulty, ProblemSummary } from '@shared/types'
import { Segmented, Select } from '@/components/ui/controls'
import { DifficultyPill } from '@/components/DifficultyPill'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import { searchProblems } from '@/components/CommandPalette'

type DiffFilter = 'all' | Difficulty
type StatusFilter = 'all' | 'todo' | 'solved' | 'attempted'
type Sort = 'id' | 'acRate' | 'difficulty'
const DIFF_ORDER: Record<Difficulty, number> = { Easy: 0, Medium: 1, Hard: 2 }

export function ProblemsView() {
  const list = useApp((s) => s.list)
  const loading = useApp((s) => s.loadingList)
  const settings = useApp((s) => s.settings)
  const openProblem = useApp((s) => s.openProblem)
  const exploreFrom = useApp((s) => s.exploreFrom)
  const setList = useApp((s) => s.setList)
  const activeSlug = useApp((s) => s.slug)

  const [q, setQ] = useState('')
  const [diff, setDiff] = useState<DiffFilter>('all')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [tag, setTag] = useState<string | null>(null)
  const [sort, setSort] = useState<Sort>('id')
  const [desc, setDesc] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const topTags = useMemo(() => {
    if (!list) return []
    const counts = new Map<string, number>()
    for (const p of list.problems) for (const t of p.tags) counts.set(t, (counts.get(t) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([slug, n]) => ({ slug, n, name: list.tags[slug] ?? slug }))
  }, [list])

  const rows = useMemo(() => {
    if (!list) return []
    let r: ProblemSummary[] = q ? searchProblems(list.problems, q, 5000) : list.problems
    r = r.filter(
      (p) =>
        (diff === 'all' || p.difficulty === diff) &&
        (!tag || p.tags.includes(tag)) &&
        (!settings.hidePaid || !p.paidOnly) &&
        (status === 'all' ||
          (status === 'solved' && p.status === 'ac') ||
          (status === 'attempted' && p.status === 'notac') ||
          (status === 'todo' && p.status !== 'ac'))
    )
    if (!q || sort !== 'id') {
      const key = (p: ProblemSummary): number =>
        sort === 'id' ? Number(p.id) || 1e9 : sort === 'acRate' ? p.acRate : DIFF_ORDER[p.difficulty] * 1e5 + Number(p.id)
      r = [...r].sort((a, b) => (key(a) - key(b)) * (desc ? -1 : 1))
    }
    return r
  }, [list, q, diff, status, tag, sort, desc, settings.hidePaid])

  const stats = useMemo(() => {
    const p = list?.problems ?? []
    return { total: p.length, solved: p.filter((x) => x.status === 'ac').length }
  }, [list])

  const parentRef = useRef<HTMLDivElement>(null)
  const virt = useVirtualizer({ count: rows.length, getScrollElement: () => parentRef.current, estimateSize: () => 40, overscan: 12 })

  const refresh = async (): Promise<void> => {
    setRefreshing(true)
    try {
      setList(await window.api.getProblems(true))
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="drag px-8 pb-4 pt-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight">Problems</h1>
            <p className="mt-0.5 text-[13px] text-muted tabular-nums">
              {list
                ? `${stats.total.toLocaleString()} problems${stats.solved ? ` · ${stats.solved.toLocaleString()} solved` : ''}`
                : loading
                  ? 'Fetching the problem set…'
                  : 'Could not load problems — check your connection.'}
            </p>
          </div>
          <Tooltip content="Refresh from LeetCode">
            <Button variant="ghost" size="icon" onClick={refresh} disabled={refreshing}>
              <RefreshCw className={cn(refreshing && 'animate-spin')} />
            </Button>
          </Tooltip>
        </div>

        <div className="no-drag mt-5 flex flex-wrap items-center gap-2">
          <div className="flex h-8 w-72 items-center gap-2 rounded-lg border border-border bg-surface px-2.5 focus-within:border-border-strong">
            <Search className="size-3.5 text-subtle" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter problems"
              className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-subtle"
            />
            {q && (
              <button onClick={() => setQ('')} className="text-subtle hover:text-fg">
                <X className="size-3.5" />
              </button>
            )}
          </div>
          <Segmented<DiffFilter>
            value={diff}
            onChange={setDiff}
            options={[
              { value: 'all', label: 'All' },
              { value: 'Easy', label: <span className="text-easy">Easy</span> },
              { value: 'Medium', label: <span className="text-medium">Medium</span> },
              { value: 'Hard', label: <span className="text-hard">Hard</span> }
            ]}
          />
          <Select
            value={status}
            onChange={(v) => setStatus(v as StatusFilter)}
            className="w-32"
            options={[
              { value: 'all', label: 'Any status' },
              { value: 'todo', label: 'Unsolved' },
              { value: 'attempted', label: 'Attempted' },
              { value: 'solved', label: 'Solved' }
            ]}
          />
          <Select
            value={sort}
            onChange={(v) => setSort(v as Sort)}
            className="w-36"
            options={[
              { value: 'id', label: 'Sort: Number' },
              { value: 'difficulty', label: 'Sort: Difficulty' },
              { value: 'acRate', label: 'Sort: Acceptance' }
            ]}
          />
          <Tooltip content={desc ? 'Descending' : 'Ascending'}>
            <Button variant="ghost" size="icon" onClick={() => setDesc(!desc)}>
              <ArrowDownUp className={cn('transition-transform', desc && 'rotate-180')} />
            </Button>
          </Tooltip>
        </div>

        <div className="no-drag -mx-8 mt-3 flex gap-1.5 overflow-x-auto px-8 pb-1 [scrollbar-width:none]">
          {topTags.slice(0, 40).map((t) => (
            <button
              key={t.slug}
              onClick={() => setTag(tag === t.slug ? null : t.slug)}
              className={cn(
                'flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors',
                tag === t.slug
                  ? 'border-accent bg-accent-soft text-fg'
                  : 'border-border text-muted hover:border-border-strong hover:text-fg'
              )}
            >
              {t.name}
              <span className="tabular-nums text-subtle">{t.n}</span>
            </button>
          ))}
        </div>
      </header>

      <div className="flex h-8 shrink-0 items-center gap-3 border-y border-border px-8 text-[11px] font-medium uppercase tracking-wider text-subtle">
        <span className="w-5" />
        <span className="w-12 text-right">#</span>
        <span className="flex-1">Title</span>
        <span className="w-20 text-right">Acceptance</span>
        <span className="w-16 text-right">Level</span>
        <span className="w-7" />
      </div>

      <div ref={parentRef} className="min-h-0 flex-1 overflow-y-auto">
        {!list && loading && <SkeletonRows />}
        <div style={{ height: virt.getTotalSize() }} className="relative">
          {virt.getVirtualItems().map((vi) => {
            const p = rows[vi.index]
            return (
              <div
                key={p.slug}
                onClick={() => openProblem(p.slug)}
                className={cn(
                  'group absolute inset-x-0 flex items-center gap-3 px-8 text-[13px] transition-colors hover:bg-surface-2/70',
                  p.slug === activeSlug && 'bg-accent-soft'
                )}
                style={{ height: vi.size, transform: `translateY(${vi.start}px)` }}
              >
                <span className="flex w-5 justify-center">
                  {p.status === 'ac' ? (
                    <CheckCircle2 className="size-4 text-easy" />
                  ) : p.status === 'notac' ? (
                    <CircleDashed className="size-4 text-medium" />
                  ) : null}
                </span>
                <span className="w-12 text-right tabular-nums text-subtle">{p.id}</span>
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="truncate font-medium">{p.title}</span>
                  {p.paidOnly && <Lock className="size-3 shrink-0 text-accent" />}
                  {settings.showTagsInList && (
                    <span className="hidden min-w-0 gap-1 overflow-hidden xl:flex">
                      {p.tags.slice(0, 3).map((t) => (
                        <span key={t} className="shrink-0 rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] text-subtle">
                          {list?.tags[t] ?? t}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
                <span className="w-20 text-right tabular-nums text-muted">{p.acRate.toFixed(1)}%</span>
                <span className="flex w-16 justify-end">
                  <DifficultyPill difficulty={p.difficulty} />
                </span>
                <span className="flex w-7 justify-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      exploreFrom(p.slug)
                    }}
                    className="rounded-md p-1 text-subtle opacity-0 transition hover:bg-surface hover:text-fg group-hover:opacity-100"
                    title="Explore related"
                  >
                    <Network className="size-3.5" />
                  </button>
                </span>
              </div>
            )
          })}
        </div>
        {list && rows.length === 0 && <div className="py-20 text-center text-sm text-subtle">Nothing matches these filters.</div>}
      </div>
    </div>
  )
}

function SkeletonRows() {
  return (
    <div className="px-8">
      {Array.from({ length: 14 }).map((_, i) => (
        <div key={i} className="flex h-10 items-center gap-3">
          <div className="h-3 w-full animate-pulse rounded bg-surface-2" style={{ width: `${40 + ((i * 37) % 45)}%` }} />
        </div>
      ))}
    </div>
  )
}
