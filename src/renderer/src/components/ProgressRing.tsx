import { motion } from 'motion/react'
import type { Profile } from '@shared/types'

const ORDER = ['Easy', 'Medium', 'Hard'] as const
const COLOR = { Easy: 'var(--easy)', Medium: 'var(--medium)', Hard: 'var(--hard)' }

/** LeetCode-style segmented ring: each difficulty owns an arc proportional to its total, filled by solved. */
export function ProgressRing({
  profile,
  size = 140,
  stroke = 7,
  showLabel = true
}: {
  profile: Pick<Profile, 'solved' | 'totals'>
  size?: number
  stroke?: number
  showLabel?: boolean
}) {
  const get = (arr: { difficulty: string; count: number }[], d: string): number =>
    arr.find((x) => x.difficulty === d)?.count ?? 0
  const total = get(profile.totals, 'All') || 1
  const solved = get(profile.solved, 'All')
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const gap = showLabel ? 0.012 : 0.03 // fraction of circumference between arcs
  const span = 0.8 // ring covers 80% of the circle like LC
  let offset = 0

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[126deg]">
        {ORDER.map((d) => {
          const frac = (get(profile.totals, d) / total) * span - gap
          const solvedFrac = frac * Math.min(1, get(profile.solved, d) / (get(profile.totals, d) || 1))
          const start = offset
          offset += frac + gap
          return (
            <g key={d}>
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={COLOR[d]}
                strokeOpacity={0.16}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={`${frac * c} ${c}`}
                strokeDashoffset={-start * c}
              />
              <motion.circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={COLOR[d]}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDashoffset={-start * c}
                initial={{ strokeDasharray: `0 ${c}` }}
                animate={{ strokeDasharray: `${Math.max(solvedFrac * c, 0.001)} ${c}` }}
                transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
              />
            </g>
          )
        })}
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="flex items-baseline gap-0.5">
            <span className="text-[28px] font-semibold tracking-tight tabular-nums">{solved}</span>
            <span className="text-xs text-subtle tabular-nums">/{total}</span>
          </div>
          <span className="text-[11px] font-medium text-muted">Solved</span>
        </div>
      )}
    </div>
  )
}
