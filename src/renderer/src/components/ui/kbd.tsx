import { cn } from '@/lib/utils'

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[5px] border border-border bg-surface-2 px-1 font-sans text-[10.5px] font-medium text-subtle',
        className
      )}
    >
      {children}
    </kbd>
  )
}
