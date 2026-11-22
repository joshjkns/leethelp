// The model picker: one short list of models grouped by provider, with the selected model's
// reasoning effort as a row of chips underneath. Used inline in the assistant's composer and as a
// field in Settings. Picking a model closes it; effort changes apply in place.
import { useEffect, useState } from 'react'
import { Popover as P } from 'radix-ui'
import { Check, ChevronDown } from 'lucide-react'
import type { ModelChoice, ModelOption, Provider } from '@shared/types'
import { cn } from '@/lib/utils'
import { PROVIDERS, effortLabel, findModel, modelLabel, useModels, withModel } from '@/lib/models'

export function ProviderIcon({ provider, className }: { provider: Provider; className?: string }) {
  if (provider === 'claude')
    return (
      <svg viewBox="0 0 16 16" className={cn('size-3.5 shrink-0 text-[#d97757]', className)} fill="currentColor" aria-hidden>
        {[0, 30, 60, 90, 120, 150].map((r) => (
          <rect key={r} x="7.1" y="1" width="1.8" height="14" rx="0.9" transform={`rotate(${r} 8 8)`} />
        ))}
      </svg>
    )
  return (
    <svg viewBox="0 0 16 16" className={cn('size-3.5 shrink-0', className)} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M8 1.5 13.6 4.75v6.5L8 14.5 2.4 11.25v-6.5Z" strokeLinejoin="round" />
      <path d="m6 6.25-1.75 1.75L6 9.75M8.5 10h2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const SHORT_EFFORT: Record<string, string> = { medium: 'Med', xhigh: 'XHigh', minimal: 'Min' }
const shortEffort = (e: string): string => SHORT_EFFORT[e] ?? effortLabel(e)

export function ModelPicker({
  value,
  onChange,
  variant = 'inline',
  side = 'top',
  align = 'start'
}: {
  value: ModelChoice
  onChange: (choice: ModelChoice) => void
  variant?: 'inline' | 'field'
  side?: 'top' | 'bottom'
  align?: 'start' | 'end'
}) {
  const catalog = useModels((s) => s.catalog)
  const load = useModels((s) => s.load)
  const [open, setOpen] = useState(false)
  const [more, setMore] = useState(false)

  useEffect(() => {
    if (!catalog) void load()
  }, [catalog, load])

  const current = findModel(catalog, value)
  const label = modelLabel(catalog, value)
  const showEffort = !!value.effort && (current?.efforts.length ?? 1) > 0
  // Older models stay hidden unless asked for, or one of them is selected.
  const showLegacy = more || !!current?.legacy
  const hasLegacy = PROVIDERS.some((p) => catalog?.[p.id].models.some((m) => m.legacy))

  const pick = (provider: Provider, m: ModelOption): void => {
    onChange(withModel(provider, m, value))
    setOpen(false)
  }

  return (
    <P.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) {
          setMore(false)
          void load(true)
        }
      }}
    >
      <P.Trigger asChild>
        {variant === 'inline' ? (
          <button
            className="no-drag flex h-6 min-w-0 items-center gap-1.5 rounded-md px-1.5 text-[11px] text-muted outline-none transition-colors hover:bg-surface-2 hover:text-fg focus-visible:ring-1 focus-visible:ring-border-strong data-[state=open]:bg-surface-2 data-[state=open]:text-fg"
            aria-label={`Model: ${label}${showEffort ? `, ${effortLabel(value.effort)} effort` : ''}`}
          >
            <ProviderIcon provider={value.provider} className="size-3" />
            <span className="truncate font-medium">{label}</span>
            {showEffort && <span className="shrink-0 text-subtle">{effortLabel(value.effort)}</span>}
            <ChevronDown className="size-3 shrink-0 text-subtle" />
          </button>
        ) : (
          <button className="no-drag inline-flex h-8 min-w-48 items-center gap-2 rounded-lg border border-border bg-surface-2 px-2.5 text-[13px] text-fg outline-none transition-colors hover:border-border-strong data-[state=open]:border-border-strong">
            <ProviderIcon provider={value.provider} />
            <span className="truncate">{label}</span>
            {showEffort && <span className="shrink-0 text-subtle">· {effortLabel(value.effort)}</span>}
            <ChevronDown className="ml-auto size-3.5 shrink-0 text-subtle" />
          </button>
        )}
      </P.Trigger>
      <P.Portal>
        <P.Content
          side={side}
          align={align}
          sideOffset={6}
          collisionPadding={8}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="z-50 flex max-h-[min(400px,var(--radix-popover-content-available-height))] w-56 animate-in flex-col overflow-hidden rounded-xl border border-border-strong bg-elevated text-fg shadow-xl shadow-black/25"
        >
          <div className="min-h-0 flex-1 overflow-y-auto p-1">
            {PROVIDERS.map((p) => {
              const info = catalog?.[p.id]
              const models = info?.models.filter((m) => showLegacy || !m.legacy) ?? []
              return (
                <div key={p.id} className="mb-1 last:mb-0">
                  <div className="flex h-6 items-center gap-1.5 px-2 text-[11px] font-medium text-subtle">
                    <ProviderIcon provider={p.id} className="size-3" />
                    {p.label}
                    {info && !info.installed && (
                      <button onClick={() => window.api.openExternal(p.url)} className="ml-auto font-normal hover:text-fg hover:underline">
                        Not installed
                      </button>
                    )}
                    {info?.installed && info.signedIn === false && <span className="ml-auto font-normal text-amber-500">Signed out</span>}
                  </div>
                  {info?.installed && info.error && !models.length && <div className="px-2 pb-1 text-[11px] text-subtle">{info.error}</div>}
                  {models.map((m) => {
                    const selected = value.provider === p.id && value.model === m.id
                    return (
                      <button
                        key={m.id}
                        title={m.description}
                        onClick={() => pick(p.id, m)}
                        className="flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-[12.5px] outline-none transition-colors hover:bg-surface-2 focus-visible:bg-surface-2"
                      >
                        <span className={cn('flex-1 truncate', selected && 'font-medium')}>{m.label}</span>
                        {selected && <Check className="size-3.5 shrink-0 text-accent" />}
                      </button>
                    )
                  })}
                </div>
              )
            })}
            {hasLegacy && !showLegacy && (
              <button
                onClick={() => setMore(true)}
                className="flex h-7 w-full items-center rounded-md px-2 text-[11.5px] text-subtle hover:bg-surface-2 hover:text-fg"
              >
                More models…
              </button>
            )}
          </div>
          {current && current.efforts.length > 0 && (
            <div className="shrink-0 border-t border-border p-1.5">
              <div className="flex gap-0.5 rounded-lg bg-surface-2 p-0.5">
                {current.efforts.map((e) => (
                  <button
                    key={e}
                    title={`${effortLabel(e)} effort`}
                    onClick={() => onChange({ ...value, effort: e })}
                    className={cn(
                      'h-6 flex-1 rounded-md text-[11px] transition-colors',
                      value.effort === e ? 'bg-elevated font-medium text-fg shadow-sm shadow-black/10' : 'text-subtle hover:text-fg'
                    )}
                  >
                    {shortEffort(e)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </P.Content>
      </P.Portal>
    </P.Root>
  )
}
