import { useMemo, useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { ArrowRight, CheckCircle2, ChevronRight, CircleDashed, ExternalLink, Lock, PartyPopper } from 'lucide-react'
import { useApp } from '@/lib/store'
import { cn, difficultyVar } from '@/lib/utils'
import { STUDY_LISTS, listProgress, listSlugs, type ListProgress, type StudySection } from '@/lib/lists'
import type { Difficulty, ProblemSummary } from '@shared/types'
import { DifficultyPill } from '@/components/DifficultyPill'
import { MiniRing } from '@/components/MiniRing'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/controls'

const DIFFS: Difficulty[] = ['Easy', 'Medium', 'Hard']

const titleFromSlug = (slug: string): string => slug.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase())

export function ListsView() {
  const listId = useApp((s) => s.listId)
  const openList = useApp((s) => s.openList)
  const openProblem = useApp((s) => s.openProblem)
  const bySlug = useApp((s) => s.bySlug)
  const settings = useApp((s) => s.settings)
  const [hideSolved, setHideSolved] = useState(false)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const list = STUDY_LISTS.find((l) => l.id === listId) ?? STUDY_LISTS[0]
  const slugs = useMemo(() => listSlugs(list), [list])
  const progress = useMemo(() => listProgress(slugs, bySlug), [slugs, bySlug])
  const next = slugs.find((s) => {
    const p = bySlug.get(s)
    return p?.status !== 'ac' && !(settings.hidePaid && p?.paidOnly)
  })

  const toggle = (name: string): void => {
    const c = new Set(collapsed)
    if (c.has(name)) c.delete(name)
    else c.add(name)
    setCollapsed(c)
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[1000px] px-8 pb-12 pt-8">
        <header className="drag">
          <h1 className="text-[22px] font-semibold tracking-tight">Lists</h1>
          <p className="mt-0.5 text-[13px] text-muted">Curated study plans, tracked against your LeetCode progress.</p>
        </header>

        <div className="no-drag mt-5 flex flex-wrap gap-1.5">
          {STUDY_LISTS.map((l) => {
            const p = listProgress(listSlugs(l), bySlug)
            return (
              <button
                key={l.id}
                onClick={() => openList(l.id)}
                className={cn(
                  'flex h-8 items-center gap-2 rounded-full border px-3 text-[13px] font-medium transition-colors',
                  l.id === list.id
                    ? 'border-accent bg-accent-soft text-fg'
                    : 'border-border text-muted hover:border-border-strong hover:text-fg'
                )}
              >
                <MiniRing value={p.solved / p.total} size={14} stroke={2} />
                {l.name}
              </button>
            )
          })}
        </div>

        <Summary key={list.id} name={list.name} description={list.description} author={list.author} url={list.url} progress={progress}>
          {next ? (
            <Button variant="primary" onClick={() => openProblem(next)}>
              {progress.solved ? 'Continue' : 'Start'} <ArrowRight />
            </Button>
          ) : (
            <span className="flex items-center gap-1.5 text-[13px] font-medium text-easy">
              <PartyPopper className="size-4" /> Complete
            </span>
          )}
        </Summary>

        <div className="mb-2 mt-8 flex items-center justify-between">
          <div className="text-[11px] font-medium uppercase tracking-wider text-subtle">
            {list.sections.length} sections · {slugs.length} problems
          </div>
          <label className="no-drag flex items-center gap-2 text-[13px] text-muted">
            Hide solved
            <Switch checked={hideSolved} onChange={setHideSolved} />
          </label>
        </div>

        <div className="flex flex-col gap-2">
          {list.sections.map((sec) => (
            <Section
              key={`${list.id}:${sec.name}`}
              section={sec}
              bySlug={bySlug}
              open={!collapsed.has(sec.name)}
              onToggle={() => toggle(sec.name)}
              hideSolved={hideSolved}
              hidePaid={settings.hidePaid}
              onOpen={openProblem}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function Summary({
  name,
  description,
  author,
  url,
  progress,
  children
}: {
  name: string
  description: string
  author: string
  url: string
  progress: ListProgress
  children: ReactNode
}) {
  const pct = progress.total ? progress.solved / progress.total : 0
  return (
    <div className="mt-5 rounded-2xl border border-border bg-surface p-6 shadow-sm shadow-black/5">
      <div className="flex items-start gap-6">
        <div className="relative">
          <MiniRing value={pct} size={88} stroke={7} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-semibold tabular-nums tracking-tight">{Math.round(pct * 100)}%</span>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight">{name}</h2>
            <button
              onClick={() => window.api.openExternal(url)}
              className="no-drag flex items-center gap-1 text-[11px] text-subtle transition-colors hover:text-fg"
            >
              by {author} <ExternalLink className="size-3" />
            </button>
          </div>
          <p className="mt-1 max-w-xl text-[13px] text-muted">{description}</p>
          <div className="mt-4 flex items-center gap-5">
            <span className="text-[13px] tabular-nums">
              <span className="font-semibold">{progress.solved}</span>
              <span className="text-subtle"> / {progress.total} solved</span>
            </span>
            {DIFFS.map((d) => {
              const x = progress.byDifficulty[d]
              if (!x.total) return null
              return (
                <span key={d} className="flex items-center gap-1.5 text-[12px] tabular-nums">
                  <span className="size-2 rounded-full" style={{ background: difficultyVar[d] }} />
                  <span className="text-muted">{d}</span>
                  <span>
                    {x.solved}
                    <span className="text-subtle">/{x.total}</span>
                  </span>
                </span>
              )
            })}
          </div>
        </div>
        <div className="no-drag shrink-0 self-center">{children}</div>
      </div>
      <DifficultyBar progress={progress} />
    </div>
  )
}

/** One bar split by difficulty: each segment's width is its share of the list, its fill is solved within it. */
function DifficultyBar({ progress }: { progress: ListProgress }) {
  const known = DIFFS.reduce((a, d) => a + progress.byDifficulty[d].total, 0) || 1
  return (
    <div className="mt-5 flex h-1.5 gap-1">
      {DIFFS.map((d) => {
        const x = progress.byDifficulty[d]
        if (!x.total) return null
        return (
          <div
            key={d}
            className="relative overflow-hidden rounded-full"
            style={{ flex: x.total / known, background: `color-mix(in srgb, ${difficultyVar[d]} 16%, transparent)` }}
          >
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ background: difficultyVar[d] }}
              initial={{ width: 0 }}
              animate={{ width: `${(x.solved / x.total) * 100}%` }}
              transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
            />
          </div>
        )
      })}
    </div>
  )
}

function Section({
  section,
  bySlug,
  open,
  onToggle,
  hideSolved,
  hidePaid,
  onOpen
}: {
  section: StudySection
  bySlug: Map<string, ProblemSummary>
  open: boolean
  onToggle: () => void
  hideSolved: boolean
  hidePaid: boolean
  onOpen: (slug: string) => void
}) {
  const activeSlug = useApp((s) => s.slug)
  const solved = section.slugs.filter((s) => bySlug.get(s)?.status === 'ac').length
  const total = section.slugs.length
  const done = solved === total
  const rows = section.slugs.filter((s) => {
    const p = bySlug.get(s)
    return !(hideSolved && p?.status === 'ac') && !(hidePaid && p?.paidOnly)
  })
  if (hideSolved && done) return null

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <button onClick={onToggle} className="no-drag flex h-11 w-full items-center gap-3 px-4 text-left transition-colors hover:bg-surface-2/60">
        <ChevronRight className={cn('size-3.5 text-subtle transition-transform', open && 'rotate-90')} />
        <span className="flex-1 truncate text-[13px] font-semibold">{section.name}</span>
        <div className="h-1 w-24 overflow-hidden rounded-full bg-surface-2">
          <motion.div
            className={cn('h-full rounded-full', done ? 'bg-easy' : 'bg-accent')}
            initial={{ width: 0 }}
            animate={{ width: `${(solved / total) * 100}%` }}
            transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
          />
        </div>
        <span className={cn('w-10 text-right text-[12px] tabular-nums', done ? 'text-easy' : 'text-subtle')}>
          {solved}/{total}
        </span>
      </button>
      {open && rows.length > 0 && (
        <div className="border-t border-border">
          {rows.map((slug) => {
            const p = bySlug.get(slug)
            return (
              <div
                key={slug}
                onClick={() => onOpen(slug)}
                className={cn(
                  'no-drag flex h-10 cursor-default items-center gap-3 px-4 text-[13px] transition-colors hover:bg-surface-2/70',
                  slug === activeSlug && 'bg-accent-soft'
                )}
              >
                <span className="flex w-3.5 justify-center" />
                <span className="flex w-5 justify-center">
                  {p?.status === 'ac' ? (
                    <CheckCircle2 className="size-4 text-easy" />
                  ) : p?.status === 'notac' ? (
                    <CircleDashed className="size-4 text-medium" />
                  ) : null}
                </span>
                <span className="w-12 text-right tabular-nums text-subtle">{p?.id}</span>
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="truncate font-medium">{p?.title ?? titleFromSlug(slug)}</span>
                  {p?.paidOnly && <Lock className="size-3 shrink-0 text-accent" />}
                </span>
                {p && <DifficultyPill difficulty={p.difficulty} />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
