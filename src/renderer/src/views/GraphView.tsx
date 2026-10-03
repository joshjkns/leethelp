import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { forceCollide } from 'd3-force'
import ForceGraph2D, { type ForceGraphMethods, type LinkObject, type NodeObject } from 'react-force-graph-2d'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, CheckCircle2, CircleDashed, Expand, Focus, Lock, Network, Play, X } from 'lucide-react'
import type { Difficulty, ProblemSummary } from '@shared/types'
import { useApp } from '@/lib/store'
import { useIsDark } from '@/lib/theme'
import { cn, cssVar } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/ui/controls'
import { DifficultyPill } from '@/components/DifficultyPill'
import { Tooltip } from '@/components/ui/tooltip'

interface GNode {
  id: string
  kind: 'tag' | 'problem'
  label: string
  size: number
  difficulty?: Difficulty
  status?: ProblemSummary['status']
  solvedFrac?: number
  depth?: number
  expanded?: boolean
}
interface GLink {
  source: string
  target: string
  weight: number
}
type N = NodeObject<GNode>
type L = LinkObject<GNode, GLink>

function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [size, setSize] = useState({ w: 800, h: 600 })
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, size] as const
}

export function GraphView() {
  const seed = useApp((s) => s.graphSeed)
  const exploreFrom = useApp((s) => s.exploreFrom)
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="drag flex items-end justify-between gap-4 px-8 pb-3 pt-8">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Explore</h1>
          <p className="mt-0.5 text-[13px] text-muted">
            {seed
              ? 'Similar-question graph. Click a node to inspect, double-click to expand its neighbours.'
              : 'Topics sized by problem count, ringed by how much of each you have solved.'}
          </p>
        </div>
        <Segmented
          value={seed ? 'problem' : 'topics'}
          onChange={(v) => exploreFrom(v === 'topics' ? null : (useApp.getState().slug ?? 'two-sum'))}
          options={[
            { value: 'topics', label: 'Topic map' },
            { value: 'problem', label: 'Problem graph' }
          ]}
        />
      </header>
      {seed ? <ProblemGraph key={seed} seed={seed} /> : <TopicMap />}
    </div>
  )
}

// ───────────────────────── shared drawing ─────────────────────────

function useColors() {
  const dark = useIsDark()
  const accent = useApp((s) => s.settings.accent)
  // Re-read CSS variables whenever theme/accent change.
  return useMemo(
    () => ({
      fg: cssVar('--fg'),
      muted: cssVar('--muted'),
      subtle: cssVar('--subtle'),
      border: cssVar('--border-strong'),
      surface: cssVar('--surface'),
      accent: cssVar('--accent'),
      Easy: cssVar('--easy'),
      Medium: cssVar('--medium'),
      Hard: cssVar('--hard'),
      dark
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dark, accent]
  )
}

function drawLabel(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, scale: number, color: string, bold = false) {
  const fs = Math.max(11 / scale, 2)
  ctx.font = `${bold ? 600 : 500} ${fs}px Inter Variable, system-ui`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillStyle = color
  ctx.fillText(text, x, y)
}

// ───────────────────────── topic map ─────────────────────────

function TopicMap() {
  const list = useApp((s) => s.list)
  const c = useColors()
  const [wrapRef, size] = useSize<HTMLDivElement>()
  const fg = useRef<ForceGraphMethods<N, L>>(undefined)
  const [hover, setHover] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  const { data, neighbours } = useMemo(() => {
    const nodes: GNode[] = []
    const links: GLink[] = []
    const neighbours = new Map<string, Set<string>>()
    if (!list) return { data: { nodes, links }, neighbours }
    const count = new Map<string, number>()
    const solved = new Map<string, number>()
    const pair = new Map<string, number>()
    for (const p of list.problems) {
      for (const t of p.tags) {
        count.set(t, (count.get(t) ?? 0) + 1)
        if (p.status === 'ac') solved.set(t, (solved.get(t) ?? 0) + 1)
      }
      for (let i = 0; i < p.tags.length; i++)
        for (let j = i + 1; j < p.tags.length; j++) {
          const k = [p.tags[i], p.tags[j]].sort().join('|')
          pair.set(k, (pair.get(k) ?? 0) + 1)
        }
    }
    const top = [...count.entries()].filter(([, n]) => n >= 12).map(([t]) => t)
    const topSet = new Set(top)
    for (const t of top) {
      nodes.push({
        id: t,
        kind: 'tag',
        label: list.tags[t] ?? t,
        size: Math.sqrt(count.get(t)!) * 1.1 + 3,
        solvedFrac: (solved.get(t) ?? 0) / count.get(t)!
      })
      neighbours.set(t, new Set())
    }
    // keep each tag's strongest associations (normalised) so the map stays readable
    const byTag = new Map<string, { other: string; w: number }[]>()
    for (const [k, n] of pair) {
      const [a, b] = k.split('|')
      if (!topSet.has(a) || !topSet.has(b)) continue
      const w = n / Math.sqrt(count.get(a)! * count.get(b)!)
      byTag.set(a, [...(byTag.get(a) ?? []), { other: b, w }])
      byTag.set(b, [...(byTag.get(b) ?? []), { other: a, w }])
    }
    const seen = new Set<string>()
    for (const [t, arr] of byTag) {
      for (const { other, w } of arr.sort((x, y) => y.w - x.w).slice(0, 3)) {
        const k = [t, other].sort().join('|')
        if (seen.has(k)) continue
        seen.add(k)
        links.push({ source: t, target: other, weight: w })
        neighbours.get(t)!.add(other)
        neighbours.get(other)!.add(t)
      }
    }
    return { data: { nodes, links }, neighbours }
  }, [list])

  useEffect(() => {
    fg.current?.d3Force('charge')?.strength(-280)
    fg.current?.d3Force('link')?.distance(60).strength(0.4)
    fg.current?.d3Force('collide', forceCollide<N>((n) => n.size + 8))
    fg.current?.d3ReheatSimulation()
  }, [data])

  const focus = selected ?? hover
  const active = (id: string): boolean => !focus || id === focus || !!neighbours.get(focus)?.has(id)

  return (
    <div className="relative flex min-h-0 flex-1">
      <div ref={wrapRef} className="min-h-0 flex-1 overflow-hidden">
        {list && (
          <ForceGraph2D<GNode, GLink>
            ref={fg}
            width={size.w}
            height={size.h}
            graphData={data}
            backgroundColor="rgba(0,0,0,0)"
            nodeRelSize={1}
            nodeVal={(n) => n.size * n.size}
            cooldownTicks={180}
            onEngineStop={() => fg.current?.zoomToFit(400, 60)}
            linkColor={(l) => {
              const s = (l.source as N).id as string
              const t = (l.target as N).id as string
              return focus && (s === focus || t === focus) ? c.accent : c.border
            }}
            linkWidth={(l) => 0.5 + l.weight * 3}
            onNodeHover={(n) => setHover((n?.id as string) ?? null)}
            onNodeClick={(n) => setSelected(n.id === selected ? null : (n.id as string))}
            onBackgroundClick={() => setSelected(null)}
            nodeCanvasObject={(n, ctx, scale) => {
              const x = n.x!
              const y = n.y!
              const r = n.size
              ctx.globalAlpha = active(n.id as string) ? 1 : 0.18
              ctx.beginPath()
              ctx.arc(x, y, r, 0, Math.PI * 2)
              ctx.fillStyle = c.surface
              ctx.fill()
              ctx.lineWidth = Math.max(r * 0.16, 1)
              ctx.strokeStyle = c.border
              ctx.stroke()
              if (n.solvedFrac) {
                ctx.beginPath()
                ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * n.solvedFrac)
                ctx.strokeStyle = c.accent
                ctx.lineCap = 'round'
                ctx.stroke()
              }
              if (r * scale > 5 || n.id === focus || (focus && neighbours.get(focus)?.has(n.id as string))) drawLabel(ctx, n.label, x, y + r + 3, scale, n.id === focus ? c.fg : c.muted, n.id === focus)
              ctx.globalAlpha = 1
            }}
            nodePointerAreaPaint={(n, color, ctx) => {
              ctx.fillStyle = color
              ctx.beginPath()
              ctx.arc(n.x!, n.y!, n.size + 2, 0, Math.PI * 2)
              ctx.fill()
            }}
          />
        )}
      </div>
      <AnimatePresence>{selected && list && <TagPanel tag={selected} onClose={() => setSelected(null)} />}</AnimatePresence>
      <Legend
        items={[
          { swatch: <span className="size-3 rounded-full border-2 border-accent" />, label: 'Solved share' },
          { swatch: <span className="size-3 rounded-full border-2 border-border-strong" />, label: 'Unsolved' }
        ]}
      />
    </div>
  )
}

function TagPanel({ tag, onClose }: { tag: string; onClose: () => void }) {
  const list = useApp((s) => s.list)!
  const exploreFrom = useApp((s) => s.exploreFrom)
  const openProblem = useApp((s) => s.openProblem)
  const [filter, setFilter] = useState<'todo' | 'all'>('todo')
  const problems = useMemo(() => {
    const order = { Easy: 0, Medium: 1, Hard: 2 }
    return list.problems
      .filter((p) => p.tags.includes(tag) && (filter === 'all' || p.status !== 'ac'))
      .sort((a, b) => order[a.difficulty] - order[b.difficulty] || b.acRate - a.acRate)
  }, [list, tag, filter])
  const all = list.problems.filter((p) => p.tags.includes(tag))
  const solved = all.filter((p) => p.status === 'ac').length

  return (
    <SidePanel onClose={onClose}>
      <div className="px-4 pt-4">
        <div className="text-[11px] font-medium uppercase tracking-wider text-subtle">Topic</div>
        <h2 className="mt-1 text-lg font-semibold tracking-tight">{list.tags[tag] ?? tag}</h2>
        <div className="mt-2 flex items-center gap-2 text-xs text-muted tabular-nums">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-accent" style={{ width: `${(solved / all.length) * 100}%` }} />
          </div>
          {solved}/{all.length}
        </div>
        <Segmented
          className="mt-3"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'todo', label: 'Unsolved' },
            { value: 'all', label: 'All' }
          ]}
        />
      </div>
      <div className="mt-2 min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {problems.slice(0, 300).map((p) => (
          <div key={p.slug} className="group flex h-9 items-center gap-2 rounded-lg px-2 text-[13px] hover:bg-surface-2">
            <StatusDot status={p.status} />
            <button onClick={() => openProblem(p.slug)} className="flex-1 truncate text-left font-medium">
              {p.title}
            </button>
            {p.paidOnly && <Lock className="size-3 text-accent" />}
            <button
              onClick={() => exploreFrom(p.slug)}
              className="hidden rounded p-1 text-subtle hover:text-fg group-hover:block"
              title="Explore graph from here"
            >
              <Network className="size-3.5" />
            </button>
            <DifficultyPill difficulty={p.difficulty} />
          </div>
        ))}
      </div>
    </SidePanel>
  )
}

// ───────────────────────── problem graph ─────────────────────────

function ProblemGraph({ seed }: { seed: string }) {
  const bySlug = useApp((s) => s.bySlug)
  const exploreFrom = useApp((s) => s.exploreFrom)
  const c = useColors()
  const [wrapRef, size] = useSize<HTMLDivElement>()
  const fg = useRef<ForceGraphMethods<N, L>>(undefined)
  const [data, setData] = useState<{ nodes: GNode[]; links: GLink[] }>({ nodes: [], links: [] })
  const [selected, setSelected] = useState<string | null>(seed)
  const [hover, setHover] = useState<string | null>(null)
  const [loading, setLoading] = useState(0)
  const [history] = useState<string[]>(() => {
    const h = JSON.parse(sessionStorage.getItem('graphHistory') ?? '[]') as string[]
    const next = [...h.filter((x) => x !== seed), seed].slice(-6)
    sessionStorage.setItem('graphHistory', JSON.stringify(next))
    return next
  })
  const nodesRef = useRef(new Map<string, GNode>())
  const linkKeys = useRef(new Set<string>())

  const mkNode = useCallback(
    (slug: string, depth: number, fallback?: { title: string; difficulty: Difficulty }): GNode => {
      const p = bySlug.get(slug)
      return {
        id: slug,
        kind: 'problem',
        label: p?.title ?? fallback?.title ?? slug,
        difficulty: p?.difficulty ?? fallback?.difficulty ?? 'Medium',
        status: p?.status ?? null,
        size: depth === 0 ? 9 : 5.5,
        depth
      }
    },
    [bySlug]
  )

  const expand = useCallback(
    async (slug: string, depth: number) => {
      const node = nodesRef.current.get(slug)
      if (node?.expanded) return
      if (node) node.expanded = true
      setLoading((n) => n + 1)
      try {
        const sim = await window.api.getSimilar(slug)
        let changed = false
        for (const s of sim) {
          if (!nodesRef.current.has(s.slug)) {
            nodesRef.current.set(s.slug, mkNode(s.slug, depth + 1, s))
            changed = true
          }
          const k = [slug, s.slug].sort().join('|')
          if (!linkKeys.current.has(k)) {
            linkKeys.current.add(k)
            changed = true
          }
        }
        if (changed) {
          setData((d) => {
            const existing = new Set(d.nodes.map((n) => n.id))
            const nodes = [...d.nodes, ...[...nodesRef.current.values()].filter((n) => !existing.has(n.id))]
            const linkSet = new Set(d.links.map((l) => [idOf(l.source), idOf(l.target)].sort().join('|')))
            const links = [
              ...d.links,
              ...[...linkKeys.current]
                .filter((k) => !linkSet.has(k))
                .map((k) => {
                  const [a, b] = k.split('|')
                  return { source: a, target: b, weight: 1 }
                })
            ]
            return { nodes, links }
          })
        }
        return sim
      } finally {
        setLoading((n) => n - 1)
      }
    },
    [mkNode]
  )

  // Seed: expand to depth 2.
  useEffect(() => {
    nodesRef.current.set(seed, mkNode(seed, 0))
    setData({ nodes: [nodesRef.current.get(seed)!], links: [] })
    expand(seed, 0).then((sim) => {
      sim?.forEach((s) => expand(s.slug, 1))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed])

  useEffect(() => {
    fg.current?.d3Force('charge')?.strength(-160)
    fg.current?.d3Force('link')?.distance(52)
    fg.current?.d3Force('collide', forceCollide<N>((n) => n.size + 6))
  }, [data])

  const adj = useMemo(() => {
    const m = new Map<string, Set<string>>()
    for (const l of data.links) {
      const a = idOf(l.source)
      const b = idOf(l.target)
      if (!m.has(a)) m.set(a, new Set())
      if (!m.has(b)) m.set(b, new Set())
      m.get(a)!.add(b)
      m.get(b)!.add(a)
    }
    return m
  }, [data])

  const focus = hover ?? selected
  const active = (id: string): boolean => !hover || id === hover || !!adj.get(hover)?.has(id)
  const lastClick = useRef<{ id: string; t: number }>({ id: '', t: 0 })

  const sel = selected ? (bySlug.get(selected) ?? null) : null
  const selNode = selected ? nodesRef.current.get(selected) : undefined

  return (
    <div className="relative flex min-h-0 flex-1">
      <div ref={wrapRef} className="min-h-0 flex-1 overflow-hidden">
        <ForceGraph2D<GNode, GLink>
          ref={fg}
          width={size.w}
          height={size.h}
          graphData={data}
          backgroundColor="rgba(0,0,0,0)"
          nodeRelSize={1}
          nodeVal={(n) => n.size * n.size}
          cooldownTicks={140}
          warmupTicks={20}
          onEngineStop={() => data.nodes.length < 60 && fg.current?.zoomToFit(400, 80)}
          linkColor={(l) => {
            const a = idOf(l.source)
            const b = idOf(l.target)
            return focus && (a === focus || b === focus) ? c.accent : c.border
          }}
          linkWidth={(l) => (focus && (idOf(l.source) === focus || idOf(l.target) === focus) ? 1.6 : 0.8)}
          linkDirectionalParticles={(l) => (hover && (idOf(l.source) === hover || idOf(l.target) === hover) ? 2 : 0)}
          linkDirectionalParticleWidth={2}
          linkDirectionalParticleColor={() => c.accent}
          onNodeHover={(n) => setHover((n?.id as string) ?? null)}
          onNodeClick={(n) => {
            const id = n.id as string
            const now = Date.now()
            if (lastClick.current.id === id && now - lastClick.current.t < 350) expand(id, n.depth ?? 1)
            lastClick.current = { id, t: now }
            setSelected(id)
          }}
          onBackgroundClick={() => setSelected(null)}
          nodeCanvasObject={(n, ctx, scale) => {
            const x = n.x!
            const y = n.y!
            const r = n.size
            const col = c[n.difficulty ?? 'Medium']
            ctx.globalAlpha = active(n.id as string) ? 1 : 0.15
            if (n.id === selected || n.depth === 0) {
              ctx.beginPath()
              ctx.arc(x, y, r + 4, 0, Math.PI * 2)
              ctx.fillStyle = n.id === selected ? c.accent + '33' : c.border
              ctx.fill()
            }
            ctx.beginPath()
            ctx.arc(x, y, r, 0, Math.PI * 2)
            if (n.status === 'ac') {
              ctx.fillStyle = col
              ctx.fill()
            } else {
              ctx.fillStyle = c.surface
              ctx.fill()
              ctx.lineWidth = n.status === 'notac' ? 2 : 1.5
              ctx.setLineDash(n.status === 'notac' ? [2, 1.5] : [])
              ctx.strokeStyle = col
              ctx.stroke()
              ctx.setLineDash([])
            }
            if (!n.expanded && n.depth !== 0) {
              ctx.beginPath()
              ctx.arc(x + r * 0.75, y - r * 0.75, 1.6, 0, Math.PI * 2)
              ctx.fillStyle = c.subtle
              ctx.fill()
            }
            const showLabel = scale > 1.4 || n.depth === 0 || n.id === focus || (hover && adj.get(hover)?.has(n.id as string))
            if (showLabel) drawLabel(ctx, n.label, x, y + r + 3, scale, n.id === focus ? c.fg : c.muted, n.id === focus || n.depth === 0)
            ctx.globalAlpha = 1
          }}
          nodePointerAreaPaint={(n, color, ctx) => {
            ctx.fillStyle = color
            ctx.beginPath()
            ctx.arc(n.x!, n.y!, n.size + 3, 0, Math.PI * 2)
            ctx.fill()
          }}
        />
      </div>

      {/* breadcrumbs */}
      <div className="absolute left-6 top-2 flex max-w-[60%] items-center gap-1 overflow-hidden">
        {history.length > 1 && (
          <Tooltip content="Back">
            <Button variant="ghost" size="iconSm" onClick={() => exploreFrom(history[history.length - 2])}>
              <ArrowLeft />
            </Button>
          </Tooltip>
        )}
        {history.map((h, i) => (
          <button
            key={h}
            onClick={() => exploreFrom(h)}
            className={cn(
              'truncate rounded-md px-2 py-1 text-xs transition-colors',
              i === history.length - 1 ? 'bg-surface-2 font-medium text-fg' : 'text-subtle hover:text-fg'
            )}
          >
            {bySlug.get(h)?.title ?? h}
          </button>
        ))}
        {loading > 0 && <span className="ml-2 size-1.5 animate-pulse rounded-full bg-accent" />}
      </div>

      <AnimatePresence>
        {selected && (
          <SidePanel onClose={() => setSelected(null)} key="sel">
            <ProblemCard
              slug={selected}
              summary={sel}
              label={selNode?.label}
              difficulty={selNode?.difficulty}
              neighbours={[...(adj.get(selected) ?? [])]}
              expanded={!!selNode?.expanded}
              onExpand={() => expand(selected, selNode?.depth ?? 1)}
              onSelect={setSelected}
            />
          </SidePanel>
        )}
      </AnimatePresence>

      <Legend
        items={[
          { swatch: <span className="size-3 rounded-full bg-easy" />, label: 'Solved' },
          { swatch: <span className="size-3 rounded-full border-2 border-dashed border-medium" />, label: 'Attempted' },
          { swatch: <span className="size-3 rounded-full border-[1.5px] border-muted" />, label: 'Todo' },
          { swatch: <span className="size-1.5 rounded-full bg-subtle" />, label: 'Expandable' }
        ]}
      />
    </div>
  )
}

function ProblemCard({
  slug,
  summary,
  label,
  difficulty,
  neighbours,
  expanded,
  onExpand,
  onSelect
}: {
  slug: string
  summary: ProblemSummary | null
  label?: string
  difficulty?: Difficulty
  neighbours: string[]
  expanded: boolean
  onExpand: () => void
  onSelect: (s: string) => void
}) {
  const list = useApp((s) => s.list)
  const bySlug = useApp((s) => s.bySlug)
  const openProblem = useApp((s) => s.openProblem)
  const exploreFrom = useApp((s) => s.exploreFrom)
  const seed = useApp((s) => s.graphSeed)
  return (
    <>
      <div className="px-4 pt-4">
        <div className="flex items-center gap-2 pr-7">
          {difficulty && <DifficultyPill difficulty={difficulty} />}
          {summary?.status && <StatusDot status={summary.status} withLabel />}
          {summary && <span className="ml-auto text-xs tabular-nums text-subtle">{summary.acRate.toFixed(1)}% AC</span>}
        </div>
        <h2 className="mt-2 text-[17px] font-semibold leading-snug tracking-tight">
          {summary && <span className="text-subtle">{summary.id}. </span>}
          {summary?.title ?? label ?? slug}
        </h2>
        {summary && (
          <div className="mt-2.5 flex flex-wrap gap-1">
            {summary.tags.map((t) => (
              <span key={t} className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] text-muted">
                {list?.tags[t] ?? t}
              </span>
            ))}
          </div>
        )}
        <div className="mt-4 flex gap-1.5">
          <Button variant="primary" size="sm" onClick={() => openProblem(slug)} className="flex-1">
            <Play /> Solve
          </Button>
          <Tooltip content="Expand neighbours">
            <Button size="sm" onClick={onExpand} disabled={expanded}>
              <Expand />
            </Button>
          </Tooltip>
          {seed !== slug && (
            <Tooltip content="Re-center graph here">
              <Button size="sm" onClick={() => exploreFrom(slug)}>
                <Focus />
              </Button>
            </Tooltip>
          )}
        </div>
      </div>
      <div className="mt-4 border-t border-border px-4 pb-1 pt-3 text-[11px] font-medium uppercase tracking-wider text-subtle">
        Connected · {neighbours.length}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {neighbours.map((n) => {
          const p = bySlug.get(n)
          return (
            <button
              key={n}
              onClick={() => onSelect(n)}
              className="flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left text-[13px] hover:bg-surface-2"
            >
              <StatusDot status={p?.status ?? null} />
              <span className="flex-1 truncate">{p?.title ?? n}</span>
              {p && <DifficultyPill difficulty={p.difficulty} />}
            </button>
          )
        })}
      </div>
    </>
  )
}

// ───────────────────────── bits ─────────────────────────

const idOf = (x: unknown): string => (typeof x === 'object' && x ? ((x as N).id as string) : (x as string))

function StatusDot({ status, withLabel }: { status: ProblemSummary['status']; withLabel?: boolean }) {
  if (status === 'ac')
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-easy">
        <CheckCircle2 className="size-3.5" />
        {withLabel && 'Solved'}
      </span>
    )
  if (status === 'notac')
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-medium">
        <CircleDashed className="size-3.5" />
        {withLabel && 'Attempted'}
      </span>
    )
  return <span className="size-3.5 shrink-0 rounded-full border border-border-strong" />
}

function SidePanel({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.aside
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
      className="absolute bottom-4 right-4 top-2 flex w-[320px] flex-col overflow-hidden rounded-2xl border border-border-strong bg-elevated/95 shadow-2xl shadow-black/20 backdrop-blur-xl"
    >
      <button onClick={onClose} className="absolute right-3 top-3 z-10 rounded-md p-1 text-subtle hover:bg-surface-2 hover:text-fg">
        <X className="size-3.5" />
      </button>
      {children}
    </motion.aside>
  )
}

function Legend({ items }: { items: { swatch: React.ReactNode; label: string }[] }) {
  return (
    <div className="pointer-events-none absolute bottom-4 left-6 flex gap-4 rounded-xl border border-border bg-elevated/80 px-3 py-2 text-[11px] text-muted backdrop-blur">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          {i.swatch}
          {i.label}
        </span>
      ))}
    </div>
  )
}
