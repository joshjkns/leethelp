import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Pane({ header, children, className }: { header: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm shadow-black/[0.03]', className)}>
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-3">{header}</div>
      {children}
    </div>
  )
}

export function PaneTab({ active, onClick, children }: { active: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex h-7 items-center gap-1.5 rounded-md px-2 text-[12.5px] font-medium transition-colors [&_svg]:size-3.5',
        active ? 'bg-surface-2 text-fg' : 'text-muted hover:text-fg'
      )}
    >
      {children}
    </button>
  )
}
