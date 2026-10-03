import { Code2, Flame, LayoutList, LogIn, Network, Search, Settings2, TrendingUp } from 'lucide-react'
import { motion } from 'motion/react'
import { useApp, type View } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Kbd } from './ui/kbd'
import { ProgressRing } from './ProgressRing'
import { DifficultyPill } from './DifficultyPill'
import { toast } from 'sonner'

const NAV: { view: View; label: string; icon: typeof Code2; key: string }[] = [
  { view: 'problems', label: 'Problems', icon: LayoutList, key: '1' },
  { view: 'workspace', label: 'Workspace', icon: Code2, key: '2' },
  { view: 'graph', label: 'Explore', icon: Network, key: '3' },
  { view: 'progress', label: 'Progress', icon: TrendingUp, key: '4' }
]

export function Sidebar() {
  const view = useApp((s) => s.view)
  const setView = useApp((s) => s.setView)
  const slug = useApp((s) => s.slug)
  const bySlug = useApp((s) => s.bySlug)
  const user = useApp((s) => s.user)
  const profile = useApp((s) => s.profile)
  const daily = useApp((s) => s.daily)
  const openProblem = useApp((s) => s.openProblem)
  const setPaletteOpen = useApp((s) => s.setPaletteOpen)
  const setSettingsOpen = useApp((s) => s.setSettingsOpen)
  const refreshUser = useApp((s) => s.refreshUser)
  const current = slug ? bySlug.get(slug) : null
  const dailySolved = daily ? bySlug.get(daily.slug)?.status === 'ac' : false

  const login = async (): Promise<void> => {
    const u = await window.api.login()
    if (u.signedIn) {
      toast.success(`Signed in as ${u.username}`)
      refreshUser()
    }
  }

  return (
    <aside className="drag flex h-full w-[228px] shrink-0 flex-col bg-[var(--sidebar)] pt-[46px]">
      <div className="px-3">
        <button
          onClick={() => setPaletteOpen(true)}
          className="no-drag flex h-8 w-full items-center gap-2 rounded-lg border border-border bg-surface/60 px-2.5 text-[13px] text-subtle transition-colors hover:border-border-strong hover:text-muted"
        >
          <Search className="size-3.5" />
          <span className="flex-1 text-left">Search problems</span>
          <span className="flex gap-0.5">
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </span>
        </button>
      </div>

      <nav className="no-drag mt-4 flex flex-col gap-0.5 px-2">
        {NAV.map(({ view: v, label, icon: Icon, key }) => {
          const disabled = v === 'workspace' && !slug
          const active = view === v
          return (
            <button
              key={v}
              disabled={disabled}
              onClick={() => setView(v)}
              className={cn(
                'group relative flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium transition-colors disabled:opacity-40',
                active ? 'text-fg' : 'text-muted hover:text-fg'
              )}
            >
              {active && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-lg bg-surface shadow-sm shadow-black/5 ring-1 ring-border"
                  transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                />
              )}
              <Icon className={cn('relative size-4', active && 'text-accent')} />
              <span className="relative flex-1 truncate text-left">
                {v === 'workspace' && current ? current.title : label}
              </span>
              <span className="relative opacity-0 transition-opacity group-hover:opacity-100">
                <Kbd>⌘{key}</Kbd>
              </span>
            </button>
          )
        })}
      </nav>

      {daily && (
        <div className="no-drag mx-3 mt-6">
          <div className="mb-1.5 px-1 text-[11px] font-medium uppercase tracking-wider text-subtle">Daily</div>
          <button
            onClick={() => openProblem(daily.slug)}
            className="w-full rounded-xl border border-border bg-surface/60 p-2.5 text-left transition-colors hover:border-border-strong"
          >
            <div className="flex items-center gap-1.5">
              <Flame className={cn('size-3.5', dailySolved ? 'text-accent' : 'text-subtle')} />
              <span className="text-[11px] text-subtle">{daily.date}</span>
              <DifficultyPill difficulty={daily.difficulty} className="ml-auto" />
            </div>
            <div className="mt-1.5 line-clamp-2 text-[13px] font-medium leading-snug">
              {daily.id}. {daily.title}
            </div>
          </button>
        </div>
      )}

      <div className="flex-1" />

      <div className="no-drag border-t border-border p-3">
        {user.signedIn && profile ? (
          <button
            onClick={() => setView('progress')}
            className="flex w-full items-center gap-3 rounded-xl p-1.5 text-left transition-colors hover:bg-surface/60"
          >
            <ProgressRing profile={profile} size={36} stroke={3.5} showLabel={false} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold">{profile.username}</div>
              <div className="text-[11px] tabular-nums text-subtle">
                {profile.solved.find((s) => s.difficulty === 'All')?.count ?? 0} solved
                {profile.streak > 0 && ` · ${profile.streak}d streak`}
              </div>
            </div>
          </button>
        ) : (
          <button
            onClick={login}
            className="flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-accent text-[13px] font-medium text-accent-fg transition hover:brightness-110"
          >
            <LogIn className="size-4" /> Sign in to LeetCode
          </button>
        )}
        <button
          onClick={() => setSettingsOpen(true)}
          className="mt-1.5 flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium text-muted transition-colors hover:text-fg"
        >
          <Settings2 className="size-4" /> Settings
          <span className="ml-auto">
            <Kbd>⌘,</Kbd>
          </span>
        </button>
      </div>
    </aside>
  )
}
