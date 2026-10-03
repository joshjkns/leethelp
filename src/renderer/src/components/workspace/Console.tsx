import { useEffect, useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { Clock, Cpu, FlaskConical, Plus, RotateCcw, SquareTerminal, X } from 'lucide-react'
import type { ProblemDetail, RunResult } from '@shared/types'
import { cn } from '@/lib/utils'
import { Button } from '../ui/button'
import { Tooltip } from '../ui/tooltip'
import { Pane, PaneTab } from './Pane'

export interface TestCase {
  values: string[]
}

export function Console({
  detail,
  cases,
  setCases,
  result,
  busy,
  tab,
  setTab,
  onResetCases
}: {
  detail: ProblemDetail | null
  cases: TestCase[]
  setCases: (c: TestCase[]) => void
  result: RunResult | null
  busy: 'run' | 'submit' | null
  tab: 'cases' | 'result'
  setTab: (t: 'cases' | 'result') => void
  onResetCases: () => void
}) {
  return (
    <Pane
      header={
        <>
          <PaneTab active={tab === 'cases'} onClick={() => setTab('cases')}>
            <FlaskConical /> Testcase
          </PaneTab>
          <PaneTab active={tab === 'result'} onClick={() => setTab('result')}>
            <SquareTerminal /> Result
            {result && !busy && (
              <span className={cn('size-1.5 rounded-full', isGood(result) ? 'bg-easy' : 'bg-hard')} />
            )}
          </PaneTab>
          <div className="flex-1" />
          {tab === 'cases' && (
            <Tooltip content="Reset testcases">
              <Button variant="ghost" size="iconSm" onClick={onResetCases}>
                <RotateCcw />
              </Button>
            </Tooltip>
          )}
        </>
      }
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {tab === 'cases' ? (
          <CasesEditor detail={detail} cases={cases} setCases={setCases} />
        ) : busy ? (
          <Judging kind={busy} />
        ) : result ? (
          <ResultView result={result} cases={cases} detail={detail} />
        ) : (
          <div className="flex h-full items-center justify-center text-[13px] text-subtle">Run your code to see results here.</div>
        )}
      </div>
    </Pane>
  )
}

const isGood = (r: RunResult): boolean =>
  r.kind === 'submit' ? r.statusCode === 10 : r.statusCode === 10 && r.compareResult !== undefined && !r.compareResult.includes('0')

function CaseTabs({
  count,
  active,
  onSelect,
  marks,
  onRemove,
  onAdd
}: {
  count: number
  active: number
  onSelect: (i: number) => void
  marks?: (boolean | undefined)[]
  onRemove?: (i: number) => void
  onAdd?: () => void
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-1.5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="group relative">
          <button
            onClick={() => onSelect(i)}
            className={cn(
              'flex h-7 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors',
              active === i ? 'bg-surface-2 text-fg ring-1 ring-border' : 'text-muted hover:bg-surface-2/60 hover:text-fg'
            )}
          >
            {marks?.[i] !== undefined && <span className={cn('size-1.5 rounded-full', marks[i] ? 'bg-easy' : 'bg-hard')} />}
            Case {i + 1}
          </button>
          {onRemove && count > 1 && (
            <button
              onClick={() => onRemove(i)}
              className="absolute -right-1 -top-1 hidden size-4 items-center justify-center rounded-full bg-elevated text-subtle ring-1 ring-border hover:text-fg group-hover:flex"
            >
              <X className="size-2.5" />
            </button>
          )}
        </div>
      ))}
      {onAdd && (
        <Tooltip content="Add testcase (copies current)">
          <button onClick={onAdd} className="flex size-7 items-center justify-center rounded-lg text-subtle hover:bg-surface-2 hover:text-fg">
            <Plus className="size-3.5" />
          </button>
        </Tooltip>
      )}
    </div>
  )
}

function CasesEditor({
  detail,
  cases,
  setCases
}: {
  detail: ProblemDetail | null
  cases: TestCase[]
  setCases: (c: TestCase[]) => void
}) {
  const [active, setActive] = useState(0)
  useEffect(() => setActive(0), [detail?.slug])
  const idx = Math.min(active, cases.length - 1)
  const current = cases[idx]
  if (!detail || !current) return null
  const names = detail.params.length === current.values.length ? detail.params.map((p) => p.name) : ['input']

  const update = (vi: number, v: string): void => {
    setCases(cases.map((c, i) => (i === idx ? { values: c.values.map((x, j) => (j === vi ? v : x)) } : c)))
  }

  return (
    <>
      <CaseTabs
        count={cases.length}
        active={idx}
        onSelect={setActive}
        onAdd={() => {
          setCases([...cases, { values: [...current.values] }])
          setActive(cases.length)
        }}
        onRemove={(i) => {
          setCases(cases.filter((_, j) => j !== i))
          setActive(Math.max(0, idx - (i <= idx ? 1 : 0)))
        }}
      />
      <div className="space-y-3">
        {current.values.map((v, i) => (
          <Field key={i} label={`${names[i]} =`}>
            <textarea
              value={v}
              spellCheck={false}
              onChange={(e) => update(i, e.target.value)}
              rows={Math.min(6, v.split('\n').length)}
              className="w-full resize-none rounded-lg border border-border bg-surface-2 px-3 py-2 font-mono text-[12.5px] leading-relaxed text-fg outline-none transition-colors focus:border-border-strong"
            />
          </Field>
        ))}
      </div>
    </>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[11.5px] font-medium text-subtle">{label}</div>
      {children}
    </div>
  )
}

function Mono({ children, tone }: { children: ReactNode; tone?: 'bad' | 'good' }) {
  return (
    <pre
      className={cn(
        'select-text whitespace-pre-wrap break-all rounded-lg border border-border bg-surface-2 px-3 py-2 font-mono text-[12.5px] leading-relaxed',
        tone === 'bad' && 'border-hard/25 bg-hard/[0.06] text-hard',
        tone === 'good' && 'text-fg'
      )}
    >
      {children}
    </pre>
  )
}

function Judging({ kind }: { kind: 'run' | 'submit' }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3">
      <div className="relative h-1 w-48 overflow-hidden rounded-full bg-surface-2">
        <motion.div
          className="absolute inset-y-0 w-1/3 rounded-full bg-accent"
          animate={{ x: ['-100%', '300%'] }}
          transition={{ repeat: Infinity, duration: 1.1, ease: 'easeInOut' }}
        />
      </div>
      <div className="text-[13px] text-muted">{kind === 'run' ? 'Running sample tests…' : 'Judging submission…'}</div>
    </div>
  )
}

function ResultView({ result: r, cases, detail }: { result: RunResult; cases: TestCase[]; detail: ProblemDetail | null }) {
  const [active, setActive] = useState(0)
  const good = isGood(r)
  const title =
    r.kind === 'run' && r.statusCode === 10 ? (good ? 'Accepted' : 'Wrong Answer') : r.statusMsg

  const header = (
    <div className="mb-3 flex items-baseline gap-3">
      <motion.h2
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn('text-lg font-semibold tracking-tight', good ? 'text-easy' : 'text-hard')}
      >
        {title}
      </motion.h2>
      {r.kind === 'submit' && r.totalTestcases != null && (
        <span className="text-xs tabular-nums text-subtle">
          {r.totalCorrect} / {r.totalTestcases} testcases passed
        </span>
      )}
      {r.kind === 'run' && r.runtime && <span className="text-xs text-subtle">Runtime: {r.runtime}</span>}
    </div>
  )

  const error = r.compileError || r.runtimeError
  if (error) {
    return (
      <div>
        {header}
        <Mono tone="bad">{error}</Mono>
        {r.lastTestcase && (
          <div className="mt-3">
            <Field label="Last executed input">
              <Mono>{r.lastTestcase}</Mono>
            </Field>
          </div>
        )}
      </div>
    )
  }

  if (r.kind === 'submit') {
    if (r.statusCode === 10) {
      return (
        <div>
          {header}
          <div className="grid grid-cols-2 gap-3">
            <Stat icon={<Clock />} label="Runtime" value={r.runtime} pct={r.runtimePercentile} />
            <Stat icon={<Cpu />} label="Memory" value={r.memory} pct={r.memoryPercentile} />
          </div>
        </div>
      )
    }
    return (
      <div className="space-y-3">
        {header}
        {r.lastTestcase && (
          <Field label="Input">
            <Mono>{formatInput(r.lastTestcase, detail)}</Mono>
          </Field>
        )}
        {r.codeOutput != null && r.codeOutput !== '' && (
          <Field label="Output">
            <Mono tone="bad">{r.codeOutput}</Mono>
          </Field>
        )}
        {r.expectedOutput != null && r.expectedOutput !== '' && (
          <Field label="Expected">
            <Mono tone="good">{r.expectedOutput}</Mono>
          </Field>
        )}
        {r.stdOutput && (
          <Field label="Stdout">
            <Mono>{r.stdOutput}</Mono>
          </Field>
        )}
      </div>
    )
  }

  // run
  const n = Math.max(cases.length, 1)
  const marks = Array.from({ length: n }, (_, i) => (r.compareResult ? r.compareResult[i] === '1' : undefined))
  const i = Math.min(active, n - 1)
  const names = detail && cases[i] && detail.params.length === cases[i].values.length ? detail.params.map((p) => p.name) : ['input']
  return (
    <div>
      {header}
      <CaseTabs count={n} active={i} onSelect={setActive} marks={marks} />
      <div className="space-y-3">
        {cases[i] && (
          <Field label="Input">
            <div className="space-y-1.5">
              {cases[i].values.map((v, j) => (
                <Mono key={j}>
                  <span className="text-subtle">{names[j]} = </span>
                  {v}
                </Mono>
              ))}
            </div>
          </Field>
        )}
        {r.stdout?.[i] && (
          <Field label="Stdout">
            <Mono>{r.stdout[i]}</Mono>
          </Field>
        )}
        <Field label="Output">
          <Mono tone={marks[i] === false ? 'bad' : undefined}>{r.codeAnswer?.[i] ?? ''}</Mono>
        </Field>
        <Field label="Expected">
          <Mono tone="good">{r.expectedAnswer?.[i] ?? ''}</Mono>
        </Field>
      </div>
    </div>
  )
}

function formatInput(raw: string, detail: ProblemDetail | null): string {
  const lines = raw.split('\n')
  if (!detail || detail.params.length !== lines.length) return raw
  return lines.map((l, i) => `${detail.params[i].name} = ${l}`).join('\n')
}

function Stat({ icon, label, value, pct }: { icon: ReactNode; label: string; value?: string; pct?: number | null }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2 p-4">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted [&_svg]:size-3.5">
        {icon}
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-tight tabular-nums">{value ?? '–'}</span>
        {pct != null && (
          <span className="text-xs text-subtle">
            Beats <span className="font-semibold text-accent">{pct.toFixed(2)}%</span>
          </span>
        )}
      </div>
      {pct != null && (
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-border">
          <motion.div
            className="h-full rounded-full bg-accent"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
          />
        </div>
      )}
    </div>
  )
}
