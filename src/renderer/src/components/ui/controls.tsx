import { Select as S, Switch as Sw, Slider as Sl } from 'radix-ui'
import { Check, ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Select({
  value,
  onChange,
  options,
  className,
  size = 'md'
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: ReactNode }[]
  className?: string
  size?: 'sm' | 'md'
}) {
  return (
    <S.Root value={value} onValueChange={onChange}>
      <S.Trigger
        className={cn(
          'no-drag inline-flex items-center justify-between gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 text-fg outline-none transition-colors hover:border-border-strong data-[state=open]:border-border-strong',
          size === 'sm' ? 'h-7 text-xs' : 'h-8 text-[13px]',
          className
        )}
      >
        <S.Value />
        <S.Icon>
          <ChevronDown className="size-3.5 text-subtle" />
        </S.Icon>
      </S.Trigger>
      <S.Portal>
        <S.Content
          position="popper"
          sideOffset={4}
          className="z-50 max-h-[min(380px,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] animate-in overflow-hidden rounded-xl border border-border-strong bg-elevated p-1 shadow-xl shadow-black/25"
        >
          <S.Viewport>
            {options.map((o) => (
              <S.Item
                key={o.value}
                value={o.value}
                className="relative flex h-7 cursor-default items-center rounded-md pl-2 pr-7 text-[13px] text-fg outline-none data-[highlighted]:bg-surface-2"
              >
                <S.ItemText>{o.label}</S.ItemText>
                <S.ItemIndicator className="absolute right-2">
                  <Check className="size-3.5 text-accent" />
                </S.ItemIndicator>
              </S.Item>
            ))}
          </S.Viewport>
        </S.Content>
      </S.Portal>
    </S.Root>
  )
}

export function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <Sw.Root
      checked={checked}
      onCheckedChange={onChange}
      className="relative h-[18px] w-[30px] shrink-0 rounded-full bg-border-strong transition-colors data-[state=checked]:bg-accent"
    >
      <Sw.Thumb className="block size-[14px] translate-x-[2px] rounded-full bg-white shadow-sm transition-transform duration-150 data-[state=checked]:translate-x-[14px]" />
    </Sw.Root>
  )
}

export function Slider({
  value,
  onChange,
  min,
  max,
  step = 1
}: {
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step?: number
}) {
  return (
    <Sl.Root
      value={[value]}
      onValueChange={([v]) => onChange(v)}
      min={min}
      max={max}
      step={step}
      className="relative flex h-4 w-32 touch-none items-center"
    >
      <Sl.Track className="relative h-1 grow rounded-full bg-border-strong">
        <Sl.Range className="absolute h-full rounded-full bg-accent" />
      </Sl.Track>
      <Sl.Thumb className="block size-3.5 rounded-full border border-border-strong bg-white shadow outline-none" />
    </Sl.Root>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode }[]
  className?: string
}) {
  return (
    <div className={cn('no-drag inline-flex rounded-lg border border-border bg-surface-2 p-0.5', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'h-6 rounded-md px-2.5 text-xs font-medium transition-all',
            value === o.value ? 'bg-elevated text-fg shadow-sm shadow-black/10' : 'text-muted hover:text-fg'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
