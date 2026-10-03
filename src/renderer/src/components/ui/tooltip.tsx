import { Tooltip as T } from 'radix-ui'
import type { ReactNode } from 'react'
import { Kbd } from './kbd'

export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <T.Provider delayDuration={350} skipDelayDuration={150}>
      {children}
    </T.Provider>
  )
}

export function Tooltip({
  content,
  shortcut,
  side = 'bottom',
  children
}: {
  content: ReactNode
  shortcut?: string[]
  side?: 'top' | 'bottom' | 'left' | 'right'
  children: ReactNode
}) {
  return (
    <T.Root>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content
          side={side}
          sideOffset={6}
          className="z-50 flex animate-in items-center gap-2 rounded-lg border border-border bg-elevated px-2 py-1 text-xs text-fg shadow-lg shadow-black/20"
        >
          {content}
          {shortcut && (
            <span className="flex gap-0.5">
              {shortcut.map((k) => (
                <Kbd key={k}>{k}</Kbd>
              ))}
            </span>
          )}
        </T.Content>
      </T.Portal>
    </T.Root>
  )
}
