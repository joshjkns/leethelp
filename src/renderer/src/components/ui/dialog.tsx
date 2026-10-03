import { Dialog as D } from 'radix-ui'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Dialog({
  open,
  onOpenChange,
  children,
  className,
  title
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  children: ReactNode
  className?: string
  title: string
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] data-[state=open]:animate-in" />
        <D.Content
          aria-describedby={undefined}
          className={cn(
            'fixed left-1/2 top-[14%] z-50 w-[560px] max-w-[calc(100vw-32px)] -translate-x-1/2 overflow-hidden rounded-2xl border border-border-strong bg-elevated shadow-2xl shadow-black/40 outline-none data-[state=open]:animate-in',
            className
          )}
        >
          <D.Title className="sr-only">{title}</D.Title>
          {children}
        </D.Content>
      </D.Portal>
    </D.Root>
  )
}
