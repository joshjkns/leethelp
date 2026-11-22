import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useApp } from '@/lib/store'

/**
 * A workspace panel. `inset` is for the top-left panel when the sidebar is hidden: the header then
 * sits level with the traffic lights, starting after them and the sidebar button (which it leaves
 * draggable, like a title bar).
 */
export function Pane({ header, children, className, inset }: { header: ReactNode; children: ReactNode; className?: string; inset?: boolean }) {
  const rounded = useApp((s) => s.settings.roundedPanels)
  return (
    <div
      className={cn(
        'flex min-h-0 flex-1 flex-col overflow-hidden',
        // Rounded: raised cards with gaps. Square: flat and edge to edge, split by the separators' lines.
        rounded && 'rounded-xl border border-border bg-surface shadow-sm shadow-black/[0.03]',
        className
      )}
    >
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-3">
        {inset && <div className="drag -ml-3 shrink-0 self-stretch" style={{ width: 'calc(90px * var(--tb, 1) + 24px)' }} />}
        {header}
      </div>
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
