import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { Award, CalendarDays, CheckCircle2, Flame, LogIn, RefreshCw, Trophy } from 'lucide-react'
import { useApp } from '@/lib/store'
import { cn, timeAgo } from '@/lib/utils'
import type { Difficulty, Profile } from '@shared/types'
import { ProgressRing } from '@/components/ProgressRing'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'

export function ProgressView() {
  const user = useApp((s) => s.user)
  const profile = useApp((s) => s.profile)
  const refreshUser = useApp((s) => s.refreshUser)
  const refreshProfile = useApp((s) => s.refreshProfile)
  const [refreshing, setRefreshing] = useState(false)

  if (!user.signedIn || !profile) {
    return (
      <div className="drag flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-accent-soft">
          <Trophy className="size-6 text-accent" />
        </div>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{user.signedIn ? 'Loading your profile…' : 'Track your progress'}</h2>
          <p className="mt-1 max-w-sm text-[13px] text-muted">
            Sign in to LeetCode to sync solved problems, streaks and your submission calendar.
          </p>
        </div>
        {!user.signedIn && (
          <Button variant="primary" size="lg" className="no-drag" onClick={() => window.api.login().then(() => refreshUser())}>
            <LogIn /> Sign in to LeetCode
          </Button>
        )}
      </div>
    )
  }

  const refresh = async (): Promise<void> => {
    setRefreshing(true)
    await refreshProfile()
    setRefreshing(false)
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[1100px] px-8 pb-12 pt-8">
        <header className="drag flex items-center gap-4">
          {profile.avatar && <img src={profile.avatar} className="size-12 rounded-full ring-1 ring-border" alt="" />}
          <div className="flex-1">
            <h1 className="text-[22px] font-semibold tracking-tight">{profile.realName || profile.username}</h1>
            <p className="text-[13px] text-muted">
              @{profile.username}
              {profile.ranking ? ` · Rank ${profile.ranking.toLocaleString()}` : ''}
            </p>
          </div>
          <Tooltip content="Refresh">
            <Button variant="ghost" size="icon" className="no-drag" onClick={refresh}>
              <RefreshCw className={cn(refreshing && 'animate-spin')} />
            </Button>
          </Tooltip>
        </header>

        <div className="mt-6 grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-4">
          <Card className="flex items-center gap-8 p-6">
            <ProgressRing profile={profile} size={150} stroke={8} />
            <div className="flex flex-1 flex-col gap-2.5">
              {(['Easy', 'Medium', 'Hard'] as Difficulty[]).map((d) => (
                <DiffRow key={d} d={d} profile={profile} />
              ))}
            </div>
          </Card>
          <div className="grid grid-cols-2 gap-4">
            <StatCard icon={<Flame />} label="Current streak" value={`${profile.streak}`} unit="days" />
            <StatCard icon={<CalendarDays />} label="Active days" value={`${profile.totalActiveDays}`} unit="this year" />
            <StatCard
              icon={<CheckCircle2 />}
              label="Submissions"
              value={Object.values(profile.calendar).reduce((a, b) => a + b, 0).toLocaleString()}
              unit="past year"
            />
            <StatCard
              icon={<Award />}
              label="Best beats"
              value={`${Math.max(0, ...profile.beats.map((b) => b.percentage ?? 0)).toFixed(1)}%`}
              unit="of users"
            />
          </div>
        </div>

        <Card className="mt-4 p-5">
          <SectionTitle>Submission activity</SectionTitle>
          <Heatmap calendar={profile.calendar} />
        </Card>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <Card className="p-5">
            <SectionTitle>Topics</SectionTitle>
            <TopicBars profile={profile} />
          </Card>
          <Card className="p-5">
            <SectionTitle>Recently accepted</SectionTitle>
            <Recent profile={profile} />
          </Card>
        </div>
      </div>
    </div>
  )
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('rounded-2xl border border-border bg-surface shadow-sm shadow-black/[0.03]', className)}>{children}</div>
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-4 text-[13px] font-semibold tracking-tight">{children}</h3>
}

function DiffRow({ d, profile }: { d: Difficulty; profile: Profile }) {
  const solved = profile.solved.find((x) => x.difficulty === d)?.count ?? 0
  const total = profile.totals.find((x) => x.difficulty === d)?.count ?? 1
  const beats = profile.beats.find((b) => b.difficulty === d)?.percentage
  const color = { Easy: 'bg-easy', Medium: 'bg-medium', Hard: 'bg-hard' }[d]
  const text = { Easy: 'text-easy', Medium: 'text-medium', Hard: 'text-hard' }[d]
  return (
    <div className="rounded-xl bg-surface-2 px-3.5 py-2.5">
      <div className="flex items-baseline justify-between">
        <span className={cn('text-xs font-semibold', text)}>{d}</span>
        <span className="text-[13px] font-semibold tabular-nums">
          {solved}
          <span className="font-normal text-subtle">/{total}</span>
        </span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-border">
        <motion.div
          className={cn('h-full rounded-full', color)}
          initial={{ width: 0 }}
          animate={{ width: `${(solved / total) * 100}%` }}
          transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
        />
      </div>
      {beats != null && <div className="mt-1.5 text-[11px] text-subtle">Beats {beats.toFixed(1)}%</div>}
    </div>
  )
}

function StatCard({ icon, label, value, unit }: { icon: React.ReactNode; label: string; value: string; unit: string }) {
  return (
    <Card className="flex flex-col justify-between p-4">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted [&_svg]:size-3.5 [&_svg]:text-accent">
        {icon}
        {label}
      </div>
      <div className="mt-3">
        <span className="text-[26px] font-semibold tracking-tight tabular-nums">{value}</span>
        <span className="ml-1.5 text-xs text-subtle">{unit}</span>
      </div>
    </Card>
  )
}

function Heatmap({ calendar }: { calendar: Record<string, number> }) {
  const { weeks, months, max } = useMemo(() => {
    // Normalise LeetCode's unix-day keys to UTC date strings.
    const byDay = new Map<string, number>()
    for (const [ts, n] of Object.entries(calendar)) byDay.set(new Date(Number(ts) * 1000).toISOString().slice(0, 10), n)
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const start = new Date(today)
    start.setUTCDate(start.getUTCDate() - 364 - start.getUTCDay())
    const weeks: { date: string; n: number; future: boolean }[][] = []
    const months: { label: string; col: number }[] = []
    let max = 1
    for (let d = new Date(start), col = 0; d <= today || d.getUTCDay() !== 0; col++) {
      const week: { date: string; n: number; future: boolean }[] = []
      for (let i = 0; i < 7; i++) {
        const key = d.toISOString().slice(0, 10)
        const n = byDay.get(key) ?? 0
        max = Math.max(max, n)
        if (d.getUTCDate() === 1) months.push({ label: d.toLocaleString('en', { month: 'short', timeZone: 'UTC' }), col })
        week.push({ date: key, n, future: d > today })
        d.setUTCDate(d.getUTCDate() + 1)
      }
      weeks.push(week)
    }
    return { weeks, months, max }
  }, [calendar])

  const level = (n: number): number => (n === 0 ? 0 : Math.min(4, Math.ceil((n / max) * 4)))
  const opacity = [0, 0.3, 0.5, 0.75, 1]

  return (
    <div className="overflow-x-auto">
      <div className="relative ml-0.5 h-4 text-[10.5px] text-subtle">
        {months.map((m) => (
          <span key={`${m.label}${m.col}`} className="absolute" style={{ left: m.col * 14 }}>
            {m.label}
          </span>
        ))}
      </div>
      <div className="flex gap-[3px]">
        {weeks.map((w, i) => (
          <div key={i} className="flex flex-col gap-[3px]">
            {w.map((day) => (
              <div
                key={day.date}
                title={`${day.n} submission${day.n === 1 ? '' : 's'} · ${day.date}`}
                className={cn('size-[11px] rounded-[3px]', day.future ? 'opacity-0' : 'bg-surface-2')}
                style={day.n ? { background: `color-mix(in oklab, var(--accent) ${opacity[level(day.n)] * 100}%, var(--surface-2))` } : undefined}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-end gap-1 text-[10.5px] text-subtle">
        Less
        {opacity.map((o, i) => (
          <span
            key={i}
            className="size-[10px] rounded-[3px] bg-surface-2"
            style={o ? { background: `color-mix(in oklab, var(--accent) ${o * 100}%, var(--surface-2))` } : undefined}
          />
        ))}
        More
      </div>
    </div>
  )
}

function TopicBars({ profile }: { profile: Profile }) {
  const list = useApp((s) => s.list)
  const rows = useMemo(() => {
    const totals = new Map<string, number>()
    for (const p of list?.problems ?? []) for (const t of p.tags) totals.set(t, (totals.get(t) ?? 0) + 1)
    return profile.tagProgress
      .map((t) => ({ ...t, total: totals.get(t.tagSlug) ?? t.problemsSolved }))
      .sort((a, b) => b.problemsSolved - a.problemsSolved)
      .slice(0, 12)
  }, [profile, list])
  const exploreFrom = useApp((s) => s.exploreFrom)

  if (!rows.length) return <p className="text-[13px] text-subtle">Solve a few problems to see topic stats.</p>
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <button key={r.tagSlug} onClick={() => exploreFrom(null)} className="group block w-full text-left">
          <div className="flex justify-between text-xs">
            <span className="font-medium group-hover:text-accent">{r.tagName}</span>
            <span className="tabular-nums text-subtle">
              {r.problemsSolved}/{r.total}
            </span>
          </div>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-2">
            <motion.div
              className="h-full rounded-full bg-accent"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (r.problemsSolved / Math.max(1, r.total)) * 100)}%` }}
              transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
            />
          </div>
        </button>
      ))}
    </div>
  )
}

function Recent({ profile }: { profile: Profile }) {
  const openProblem = useApp((s) => s.openProblem)
  const bySlug = useApp((s) => s.bySlug)
  if (!profile.recent.length) return <p className="text-[13px] text-subtle">No recent accepted submissions.</p>
  return (
    <div className="-mx-2">
      {profile.recent.map((r) => {
        const p = bySlug.get(r.slug)
        return (
          <button
            key={`${r.slug}${r.timestamp}`}
            onClick={() => openProblem(r.slug)}
            className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2 text-left text-[13px] hover:bg-surface-2"
          >
            <CheckCircle2 className="size-3.5 shrink-0 text-easy" />
            <span className="flex-1 truncate font-medium">{r.title}</span>
            {p && (
              <span className={cn('text-[11px] font-semibold', { Easy: 'text-easy', Medium: 'text-medium', Hard: 'text-hard' }[p.difficulty])}>
                {p.difficulty}
              </span>
            )}
            <span className="w-16 text-right text-xs text-subtle">{timeAgo(r.timestamp)}</span>
          </button>
        )
      })}
    </div>
  )
}
