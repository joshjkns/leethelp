import type { Difficulty } from '@shared/types'
import { cn } from '@/lib/utils'

const styles: Record<Difficulty, string> = {
  Easy: 'text-easy bg-easy/10',
  Medium: 'text-medium bg-medium/10',
  Hard: 'text-hard bg-hard/10'
}

export function DifficultyPill({ difficulty, className }: { difficulty: Difficulty; className?: string }) {
  return (
    <span className={cn('inline-flex h-5 items-center rounded-md px-1.5 text-[11px] font-semibold', styles[difficulty], className)}>
      {difficulty === 'Medium' ? 'Med.' : difficulty}
    </span>
  )
}
