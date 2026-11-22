import { useEffect, useRef, useState } from 'react'
import { Check, KeyRound, Loader2, Sparkles, TriangleAlert } from 'lucide-react'
import type { AiStatus, Difficulty } from '@shared/types'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/ui/controls'
import { Kbd } from '@/components/ui/kbd'
import { cn } from '@/lib/utils'
import { useApp } from '@/lib/store'
import { generateProblem, useCustomProblems, type Stage } from '@/lib/custom-problems'

const IDEAS = ['Sliding window', 'Two pointers', 'Prefix sums', 'Monotonic stack', 'Binary search on the answer', 'Hash map counting', '1D dynamic programming', 'Grid BFS']

export function GenerateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const add = useCustomProblems((s) => s.add)
  const openCustom = useApp((s) => s.openCustom)
  const [status, setStatus] = useState<AiStatus | null>(null)
  const [keyInput, setKeyInput] = useState('')
  const [topic, setTopic] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty>('Medium')
  const [stage, setStage] = useState<Stage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const topicRef = useRef<HTMLInputElement>(null)
  const busy = !!stage

  useEffect(() => {
    if (!open) return
    setError(null)
    window.api.getAiStatus().then(setStatus).catch(() => setStatus({ claudeCode: false, key: null, using: null }))
  }, [open])

  const saveKey = async (key: string | null): Promise<void> => {
    setError(null)
    try {
      setStatus(await window.api.setAiKey(key))
      setKeyInput('')
      requestAnimationFrame(() => topicRef.current?.focus())
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const generate = async (): Promise<void> => {
    if (busy) return
    setError(null)
    try {
      const problem = await generateProblem(topic, difficulty, setStage)
      add(problem)
      onOpenChange(false)
      openCustom(problem.id)
      setTopic('')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setStage(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)} title="Generate a problem" className="w-[600px]">
      <div className="p-5">
        <div className="flex items-center gap-2 text-[15px] font-semibold">
          <Sparkles className="size-4 text-accent" />
          Generate a problem
        </div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
          Claude writes an original LeetCode-style problem with examples, constraints, hints and hidden tests, then it opens in the
          workspace for you to solve from scratch. It's only saved once its reference solution passes all of its tests. Takes a
          minute or two.
        </p>

        {status?.using === null ? (
          <form
            className="mt-5"
            onSubmit={(e) => {
              e.preventDefault()
              if (keyInput.trim()) void saveKey(keyInput)
            }}
          >
            <label className="text-[12px] font-medium text-muted">Anthropic API key</label>
            <div className="mt-1.5 flex gap-2">
              <input
                autoFocus
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="sk-ant-…"
                spellCheck={false}
                className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-surface-2 px-3 font-mono text-[13px] outline-none focus:border-accent/60"
              />
              <Button type="submit" variant="primary" size="lg" className="h-9" disabled={!keyInput.trim()}>
                <KeyRound /> Save key
              </Button>
            </div>
            <p className="mt-2 text-[11.5px] leading-relaxed text-subtle">
              Easiest: install Claude Code and sign in (run <code className="font-mono">claude</code> in a terminal), then reopen
              this; it'll use your Claude Code login and no key is needed. Otherwise, paste an API key from the Anthropic Console.
              It's encrypted with your macOS keychain and only used from the app's main process.
            </p>
          </form>
        ) : (
          <form
            className="mt-5"
            onSubmit={(e) => {
              e.preventDefault()
              void generate()
            }}
            onKeyDown={(e) => {
              if (e.metaKey && e.key === 'Enter') {
                e.preventDefault()
                void generate()
              }
            }}
          >
            <label className="text-[12px] font-medium text-muted">Topic</label>
            <input
              ref={topicRef}
              autoFocus
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={busy}
              placeholder="e.g. sliding window over a string, intervals, top-k with a heap…"
              spellCheck={false}
              className="mt-1.5 h-9 w-full rounded-lg border border-border bg-surface-2 px-3 text-[13px] outline-none focus:border-accent/60 disabled:opacity-60"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {IDEAS.map((idea) => (
                <button
                  key={idea}
                  type="button"
                  disabled={busy}
                  onClick={() => setTopic(idea)}
                  className={cn(
                    'h-6 rounded-full border px-2.5 text-[11.5px] transition-colors disabled:opacity-50',
                    topic === idea ? 'border-accent bg-accent-soft text-fg' : 'border-border text-muted hover:border-border-strong hover:text-fg'
                  )}
                >
                  {idea}
                </button>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <Segmented<Difficulty>
                value={difficulty}
                onChange={(d) => !busy && setDifficulty(d)}
                options={(['Easy', 'Medium', 'Hard'] as const).map((d) => ({ value: d, label: d }))}
              />
              <Button type="submit" variant="primary" size="lg" disabled={busy}>
                {busy ? <Loader2 className="animate-spin" /> : <Sparkles />}
                {busy ? 'Working…' : 'Generate'}
                {!busy && <Kbd className="ml-1 border-transparent bg-black/10 text-current">⌘↵</Kbd>}
              </Button>
            </div>

            {stage && <Progress stage={stage} />}

            <div className="mt-4 flex items-center gap-1.5 text-[11.5px] text-subtle">
              <Check className="size-3 text-easy" />
              {status?.using === 'claude-code'
                ? 'Using your Claude Code login'
                : status?.key === 'env'
                  ? 'Using ANTHROPIC_API_KEY from the environment'
                  : 'Using your saved API key'}
              {status?.using === 'api' && status.key === 'saved' && !busy && (
                <button type="button" onClick={() => void saveKey(null)} className="ml-1 underline-offset-2 hover:text-muted hover:underline">
                  Remove
                </button>
              )}
            </div>
          </form>
        )}

        {error && (
          <div className="mt-4 flex gap-2 rounded-xl border border-hard/30 bg-hard/5 px-3.5 py-2.5 text-[12.5px] text-hard">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
            <span className="whitespace-pre-wrap">{error}</span>
          </div>
        )}
      </div>
    </Dialog>
  )
}

function Progress({ stage }: { stage: Stage }) {
  const steps = [
    { key: 'generating', label: stage.attempt > 1 ? 'Fixing the problem with the test failures' : 'Writing the problem' },
    { key: 'verifying', label: 'Checking the reference solution against every test' }
  ]
  const at = steps.findIndex((s) => s.key === stage.step)
  return (
    <div className="mt-4 space-y-1.5 rounded-xl border border-border bg-surface-2/60 px-3.5 py-2.5 text-[12.5px]">
      {steps.map((s, i) => (
        <div key={s.key} className={cn('flex items-center gap-2', i > at ? 'text-subtle' : 'text-fg')}>
          {i < at ? <Check className="size-3.5 text-easy" /> : i === at ? <Loader2 className="size-3.5 animate-spin text-accent" /> : <span className="size-3.5" />}
          {s.label}
          {i === at && stage.attempt > 1 && <span className="text-subtle">· attempt {stage.attempt}</span>}
        </div>
      ))}
    </div>
  )
}
