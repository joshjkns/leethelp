import { useMemo, useRef, useState, type MouseEvent } from 'react'
import DOMPurify from 'dompurify'
import { motion, AnimatePresence } from 'motion/react'
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  ExternalLink,
  Lightbulb,
  Lock,
  Network,
  ThumbsUp,
  Waypoints
} from 'lucide-react'
import type { ProblemDetail } from '@shared/types'
import { useApp } from '@/lib/store'
import { cn } from '@/lib/utils'
import { DifficultyPill } from '../DifficultyPill'
import { Button } from '../ui/button'
import { Tooltip } from '../ui/tooltip'
import { Pane, PaneTab } from './Pane'

export function Description({ detail, error }: { detail: ProblemDetail | null; error: string | null }) {
  const [tab, setTab] = useState<'desc' | 'related'>('desc')
  const exploreFrom = useApp((s) => s.exploreFrom)
  const scrollRef = useRef<HTMLDivElement>(null)

  return (
    <Pane
      header={
        <>
          <PaneTab active={tab === 'desc'} onClick={() => setTab('desc')}>
            <BookOpen /> Description
          </PaneTab>
          <PaneTab active={tab === 'related'} onClick={() => setTab('related')}>
            <Waypoints /> Related
            {detail && detail.similar.length > 0 && (
              <span className="rounded bg-surface-2 px-1 text-[10px] tabular-nums text-subtle">{detail.similar.length}</span>
            )}
          </PaneTab>
          <div className="flex-1" />
          {detail && (
            <>
              <Tooltip content="Explore in graph">
                <Button variant="ghost" size="iconSm" onClick={() => exploreFrom(detail.slug)}>
                  <Network />
                </Button>
              </Tooltip>
              <Tooltip content="Open on leetcode.com">
                <Button
                  variant="ghost"
                  size="iconSm"
                  onClick={() => window.api.openExternal(`https://leetcode.com/problems/${detail.slug}/`)}
                >
                  <ExternalLink />
                </Button>
              </Tooltip>
            </>
          )}
        </>
      }
    >
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        {error ? (
          <div className="p-6 text-sm text-hard">{error}</div>
        ) : !detail ? (
          <DescSkeleton />
        ) : tab === 'desc' ? (
          <DescBody detail={detail} />
        ) : (
          <Related detail={detail} />
        )}
      </div>
    </Pane>
  )
}

function DescBody({ detail }: { detail: ProblemDetail }) {
  const openProblem = useApp((s) => s.openProblem)
  const html = useMemo(() => (detail.content ? DOMPurify.sanitize(detail.content) : ''), [detail.content])

  const onClick = (e: MouseEvent): void => {
    const a = (e.target as HTMLElement).closest('a')
    if (!a) return
    e.preventDefault()
    const m = a.href.match(/leetcode\.com\/problems\/([^/?#]+)/)
    if (m) openProblem(m[1])
    else if (a.href.startsWith('https://')) window.api.openExternal(a.href)
  }

  return (
    <div className="px-6 py-5">
      <h1 className="select-text text-xl font-semibold tracking-tight">
        {detail.id}. {detail.title}
      </h1>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <DifficultyPill difficulty={detail.difficulty} />
        {detail.status === 'ac' && (
          <span className="flex items-center gap-1 text-xs font-medium text-easy">
            <CheckCircle2 className="size-3.5" /> Solved
          </span>
        )}
        {detail.status === 'notac' && (
          <span className="flex items-center gap-1 text-xs font-medium text-medium">
            <CircleDashed className="size-3.5" /> Attempted
          </span>
        )}
        <span className="flex items-center gap-1 text-xs text-subtle">
          <ThumbsUp className="size-3" /> {detail.likes.toLocaleString()}
        </span>
        {detail.acRate && <span className="text-xs text-subtle">· {detail.acRate} acceptance</span>}
      </div>
      {detail.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {detail.tags.map((t) => (
            <span key={t.slug} className="rounded-md bg-surface-2 px-2 py-0.5 text-[11.5px] font-medium text-muted">
              {t.name}
            </span>
          ))}
        </div>
      )}

      {detail.content ? (
        <div className="prose-lc mt-5" onClick={onClick} dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <div className="mt-10 flex flex-col items-center gap-2 text-center text-sm text-muted">
          <Lock className="size-5 text-accent" />
          This is a Premium problem. Sign in with a Premium account to view it.
        </div>
      )}

      {detail.hints.length > 0 && (
        <div className="mt-6 space-y-1.5">
          {detail.hints.map((h, i) => (
            <Hint key={i} index={i + 1} html={h} />
          ))}
        </div>
      )}

      {detail.totalSubmission && (
        <div className="mt-6 flex gap-6 border-t border-border pt-4 text-xs text-subtle">
          <span>
            Accepted <span className="font-medium text-muted">{detail.totalAccepted}</span>
          </span>
          <span>
            Submissions <span className="font-medium text-muted">{detail.totalSubmission}</span>
          </span>
        </div>
      )}
    </div>
  )
}

function Hint({ index, html }: { index: number; html: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <button onClick={() => setOpen(!open)} className="flex h-9 w-full items-center gap-2 px-3 text-[13px] font-medium text-muted hover:text-fg">
        <Lightbulb className="size-3.5 text-accent" /> Hint {index}
        <ChevronRight className={cn('ml-auto size-3.5 transition-transform', open && 'rotate-90')} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} transition={{ duration: 0.18 }}>
            <div className="prose-lc border-t border-border px-3 py-2 !text-[13px]" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Related({ detail }: { detail: ProblemDetail }) {
  const bySlug = useApp((s) => s.bySlug)
  const list = useApp((s) => s.list)
  const openProblem = useApp((s) => s.openProblem)
  const exploreFrom = useApp((s) => s.exploreFrom)

  // Problems sharing the most tags — a useful second axis beyond LeetCode's curated "similar".
  const sameTags = useMemo(() => {
    if (!list) return []
    const mine = new Set(detail.tags.map((t) => t.slug))
    const similar = new Set(detail.similar.map((s) => s.slug))
    return list.problems
      .filter((p) => p.slug !== detail.slug && !similar.has(p.slug) && !p.paidOnly)
      .map((p) => ({ p, n: p.tags.filter((t) => mine.has(t)).length / Math.sqrt(p.tags.length || 1) }))
      .filter((x) => x.n > 0)
      .sort((a, b) => b.n - a.n)
      .slice(0, 12)
      .map((x) => x.p)
  }, [list, detail])

  const Row = ({ slug, title, difficulty }: { slug: string; title: string; difficulty: ProblemDetail['difficulty'] }) => {
    const s = bySlug.get(slug)
    return (
      <button
        onClick={() => openProblem(slug)}
        className="group flex h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] transition-colors hover:bg-surface-2"
      >
        {s?.status === 'ac' ? (
          <CheckCircle2 className="size-4 shrink-0 text-easy" />
        ) : s?.status === 'notac' ? (
          <CircleDashed className="size-4 shrink-0 text-medium" />
        ) : (
          <span className="size-4 shrink-0 rounded-full border border-border-strong" />
        )}
        <span className="w-10 shrink-0 text-right tabular-nums text-subtle">{s?.id}</span>
        <span className="flex-1 truncate font-medium">{title}</span>
        {s?.paidOnly && <Lock className="size-3 text-accent" />}
        <DifficultyPill difficulty={difficulty} />
      </button>
    )
  }

  return (
    <div className="px-4 py-4">
      <div className="mb-2 flex items-center justify-between px-2.5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-subtle">Similar questions</h3>
        <Button variant="ghost" size="sm" onClick={() => exploreFrom(detail.slug)}>
          <Network /> Open graph
        </Button>
      </div>
      {detail.similar.length === 0 && <p className="px-2.5 py-3 text-sm text-subtle">LeetCode lists no similar questions.</p>}
      {detail.similar.map((s) => (
        <Row key={s.slug} {...s} />
      ))}
      <h3 className="mb-2 mt-6 px-2.5 text-xs font-semibold uppercase tracking-wider text-subtle">Shares topics</h3>
      {sameTags.map((p) => (
        <Row key={p.slug} slug={p.slug} title={p.title} difficulty={p.difficulty} />
      ))}
    </div>
  )
}

function DescSkeleton() {
  return (
    <div className="space-y-3 px-6 py-6">
      <div className="h-6 w-2/3 animate-pulse rounded-md bg-surface-2" />
      <div className="h-4 w-40 animate-pulse rounded-md bg-surface-2" />
      <div className="h-px" />
      {[92, 85, 97, 60, 0, 88, 74].map((w, i) => (
        <div key={i} className="h-3.5 animate-pulse rounded bg-surface-2" style={{ width: `${w}%`, opacity: w ? 1 : 0 }} />
      ))}
    </div>
  )
}
