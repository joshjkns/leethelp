import { Command } from 'cmdk'
import { useMemo, useState } from 'react'
import { CheckCircle2, CircleDashed, Dice5, LayoutList, Moon, Network, PanelLeft, Search, Settings2, TrendingUp } from 'lucide-react'
import { useApp } from '@/lib/store'
import type { ProblemSummary } from '@shared/types'
import { Dialog } from './ui/dialog'
import { DifficultyPill } from './DifficultyPill'
import { Kbd } from './ui/kbd'

export function searchProblems(problems: ProblemSummary[], q: string, limit = 60): ProblemSummary[] {
  const query = q.trim().toLowerCase()
  if (!query) return problems.slice(0, limit)
  const words = query.split(/\s+/)
  const scored: [number, ProblemSummary][] = []
  for (const p of problems) {
    const title = p.title.toLowerCase()
    let score = 0
    if (p.id === query) score = 1000
    else if (title === query) score = 900
    else if (title.startsWith(query)) score = 700
    else if (title.includes(query)) score = 500
    else if (words.every((w) => title.includes(w) || p.tags.some((t) => t.startsWith(w)))) score = 300
    else continue
    scored.push([score - Number(p.id) / 10000, p])
  }
  return scored
    .sort((a, b) => b[0] - a[0])
    .slice(0, limit)
    .map((x) => x[1])
}

function StatusIcon({ status }: { status: ProblemSummary['status'] }) {
  if (status === 'ac') return <CheckCircle2 className="size-3.5 text-easy" />
  if (status === 'notac') return <CircleDashed className="size-3.5 text-medium" />
  return <span className="size-3.5" />
}

export function CommandPalette() {
  const open = useApp((s) => s.paletteOpen)
  const setOpen = useApp((s) => s.setPaletteOpen)
  const list = useApp((s) => s.list)
  const openProblem = useApp((s) => s.openProblem)
  const setView = useApp((s) => s.setView)
  const setSettingsOpen = useApp((s) => s.setSettingsOpen)
  const exploreFrom = useApp((s) => s.exploreFrom)
  const updateSettings = useApp((s) => s.updateSettings)
  const [q, setQ] = useState('')

  const results = useMemo(() => searchProblems(list?.problems ?? [], q, q ? 60 : 8), [list, q])

  const close = (): void => {
    setOpen(false)
    setQ('')
  }
  const act = (fn: () => void) => () => {
    fn()
    close()
  }

  const random = (): void => {
    const pool = (list?.problems ?? []).filter((p) => !p.paidOnly && p.status !== 'ac')
    if (pool.length) openProblem(pool[Math.floor(Math.random() * pool.length)].slug)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())} title="Command palette" className="w-[620px]">
      <Command shouldFilter={false} loop className="flex flex-col">
        <div className="flex items-center gap-2.5 border-b border-border px-4">
          <Search className="size-4 text-subtle" />
          <Command.Input
            autoFocus
            value={q}
            onValueChange={setQ}
            placeholder="Search by title, number or tag…"
            className="h-12 flex-1 bg-transparent text-[15px] outline-none placeholder:text-subtle"
          />
          <Kbd>esc</Kbd>
        </div>
        <Command.List className="max-h-[420px] overflow-y-auto p-1.5">
          <Command.Empty className="py-10 text-center text-sm text-subtle">No problems match “{q}”.</Command.Empty>
          {results.length > 0 && (
            <Command.Group heading="Problems">
              {results.map((p) => (
                <Command.Item
                  key={p.slug}
                  value={p.slug}
                  onSelect={act(() => openProblem(p.slug))}
                  className="flex h-9 cursor-default items-center gap-2.5 rounded-lg px-2.5 text-[13px]"
                >
                  <StatusIcon status={p.status} />
                  <span className="w-10 shrink-0 text-right tabular-nums text-subtle">{p.id}</span>
                  <span className="flex-1 truncate">{p.title}</span>
                  {p.paidOnly && <span className="text-[10px] font-semibold text-accent">PREMIUM</span>}
                  <DifficultyPill difficulty={p.difficulty} />
                </Command.Item>
              ))}
            </Command.Group>
          )}
          {!q && (
            <Command.Group heading="Actions">
              {[
                { icon: Dice5, label: 'Random unsolved problem', run: random },
                { icon: LayoutList, label: 'Go to Problems', run: () => setView('problems') },
                { icon: Network, label: 'Explore topic map', run: () => exploreFrom(null) },
                { icon: TrendingUp, label: 'Go to Progress', run: () => setView('progress') },
                {
                  icon: Moon,
                  label: 'Toggle dark mode',
                  run: () =>
                    updateSettings({
                      theme: document.documentElement.classList.contains('dark') ? 'light' : 'dark'
                    })
                },
                {
                  icon: PanelLeft,
                  label: 'Toggle sidebar',
                  run: () => updateSettings({ sidebarHidden: !useApp.getState().settings.sidebarHidden })
                },
                { icon: Settings2, label: 'Open Settings', run: () => setSettingsOpen(true) }
              ].map(({ icon: Icon, label, run }) => (
                <Command.Item
                  key={label}
                  value={label}
                  onSelect={act(run)}
                  className="flex h-9 cursor-default items-center gap-2.5 rounded-lg px-2.5 text-[13px] text-muted data-[selected=true]:text-fg"
                >
                  <Icon className="size-4" />
                  {label}
                </Command.Item>
              ))}
            </Command.Group>
          )}
        </Command.List>
        <div className="flex items-center gap-3 border-t border-border px-4 py-2 text-[11px] text-subtle">
          <span className="flex items-center gap-1">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> navigate
          </span>
          <span className="flex items-center gap-1">
            <Kbd>↵</Kbd> open
          </span>
          <span className="ml-auto">{list ? `${list.problems.length.toLocaleString()} problems` : 'Loading…'}</span>
        </div>
      </Command>
    </Dialog>
  )
}
