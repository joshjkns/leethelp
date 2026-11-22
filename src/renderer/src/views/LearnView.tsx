import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useAnimationControls } from 'motion/react'
import Editor from '@monaco-editor/react'
import { initVimMode } from 'monaco-vim'
import { ArrowRight, Check, Eye, Flame, Loader2, Play, RotateCcw, SquareArrowOutUpRight, Trophy, X } from 'lucide-react'
import { monaco } from '@/lib/monaco'
import { useApp } from '@/lib/store'
import { useIsDark } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { DECKS } from '@/lib/trainer/decks'
import { CATEGORIES, type BlankCard, type Card, type ChoiceCard, type TypeCard } from '@/lib/trainer/types'
import { markShown, pickCard, poolFor, useTrainer, type Focus } from '@/lib/trainer/store'
import { equal, evaluate, normalize, preloadCompiler, runTests, show, type RunResult } from '@/lib/trainer/runner'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/controls'
import { Kbd } from '@/components/ui/kbd'
import { Tooltip } from '@/components/ui/tooltip'

const deck = DECKS[0]
const ADVANCE_MS = 1300
const allCards = (): Card[] => deck.cards

/** Result of the current card. `final` is false while a failed blank can still be retried. */
interface Answered {
  correct: boolean
  final: boolean
}

interface CardProps<C extends Card> {
  card: C
  answered: Answered | null
  onAnswer: (correct: boolean, final?: boolean) => void
}

/** Typing into an input or the editor shouldn't trigger card shortcuts. */
const typingIn = (t: EventTarget | null): boolean =>
  t instanceof HTMLElement && (t.isContentEditable || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || !!t.closest('.monaco-editor'))
/** Keys pressed while a dialog is open belong to the dialog, not the card behind it. */
const dialogOpen = (): boolean => !!document.querySelector('[role="dialog"]')

export function LearnView() {
  const focus = useTrainer((s) => s.focus)
  const setFocus = useTrainer((s) => s.setFocus)
  const mistakes = useTrainer((s) => s.mistakes)
  const stats = useTrainer((s) => s.stats)
  const autoAdvance = useTrainer((s) => s.autoAdvance)
  const setAutoAdvance = useTrainer((s) => s.setAutoAdvance)
  const record = useTrainer((s) => s.record)
  const cards = deck.cards
  const dark = useIsDark()

  const [card, setCard] = useState<Card | null>(null)
  // Bumped on every new card so the same card drawn twice still remounts fresh.
  const [nonce, setNonce] = useState(0)
  const [answered, setAnswered] = useState<Answered | null>(null)
  const [session, setSession] = useState({ answered: 0, right: 0 })

  useEffect(() => {
    monaco.editor.setTheme(dark ? 'lh-dark' : 'lh-light')
  }, [dark])
  useEffect(preloadCompiler, [])

  const next = useCallback((f: Focus = useTrainer.getState().focus) => {
    const s = useTrainer.getState()
    show(pickCard(poolFor(allCards(), f, s.mistakes), s))
  }, [])

  function show(c: Card | null): void {
    if (c) markShown(c.id)
    setCard(c)
    setAnswered(null)
    setNonce((n) => n + 1)
  }

  // A new card whenever the focus changes (and on first open).
  useEffect(() => next(focus), [focus, next])

  const onAnswer = useCallback(
    (correct: boolean, final = true) => {
      if (!card) return
      // Only the first result counts towards stats and the combo.
      if (!answered) {
        record(card.id, correct)
        setSession((s) => ({ answered: s.answered + 1, right: s.right + (correct ? 1 : 0) }))
      }
      setAnswered({ correct: answered ? answered.correct : correct, final })
    },
    [card, answered, record]
  )

  const reveal = useCallback(() => {
    if (!answered?.final) onAnswer(false)
  }, [answered, onAnswer])

  // Correct choice/typed answers move on by themselves.
  useEffect(() => {
    if (!answered?.final || !answered.correct || !autoAdvance || card?.kind === 'blank') return
    const t = setTimeout(() => next(), ADVANCE_MS)
    return () => clearTimeout(t)
  }, [answered, autoAdvance, card, next])

  // Capture phase so Enter reaches us before the (read-only) editor swallows it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (dialogOpen()) return
      if (e.metaKey && e.key === '.') {
        e.preventDefault()
        reveal()
      } else if (answered?.final && (e.key === 'Enter' || (e.key === ' ' && !typingIn(e.target)))) {
        e.preventDefault()
        e.stopPropagation()
        next()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [answered, next, reveal])

  const counts = useMemo(() => {
    const by: Record<string, number> = {
      all: cards.length,
      mistakes: cards.filter((c) => mistakes[c.id]).length
    }
    for (const c of cards) by[c.cat] = (by[c.cat] ?? 0) + 1
    return by
  }, [cards, mistakes])
  const seen = cards.filter((c) => stats[c.id]).length
  const blurb = CATEGORIES.find((c) => c.id === focus)?.blurb

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[820px] px-8 pb-16 pt-8">
        <header className="drag flex items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2.5 text-[22px] font-semibold tracking-tight">
              Learn
              <span className="rounded-md border border-border bg-surface px-1.5 py-0.5 font-mono text-[11px] font-medium text-muted">
                {deck.label}
              </span>
            </h1>
            <p className="mt-0.5 text-[13px] text-muted">
              Quick-fire interview drills. {seen}/{cards.length} cards seen
              {session.answered > 0 && (
                <>
                  {' '}
                  · {session.right}/{session.answered} right this session
                </>
              )}
            </p>
          </div>
          <div className="no-drag flex items-center gap-2">
            <ComboChip />
          </div>
        </header>

        <div className="no-drag mt-5 flex flex-wrap items-center gap-1.5">
          {(['all', ...CATEGORIES.map((c) => c.id), 'mistakes'] as Focus[]).map((f) => {
            const label = f === 'all' ? 'All' : f === 'mistakes' ? 'Mistakes' : CATEGORIES.find((c) => c.id === f)!.label
            return (
              <button
                key={f}
                onClick={() => (f === focus ? next(f) : setFocus(f))}
                className={cn(
                  'flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors',
                  f === focus ? 'border-accent bg-accent-soft text-fg' : 'border-border text-muted hover:border-border-strong hover:text-fg'
                )}
              >
                {label}
                <span className={cn('text-[11px] tabular-nums', f === 'mistakes' && counts.mistakes ? 'text-hard' : 'text-subtle')}>
                  {counts[f] ?? 0}
                </span>
              </button>
            )
          })}
          <div className="flex-1" />
          <label className="flex items-center gap-2 text-[12px] text-muted">
            Auto-advance
            <Switch checked={autoAdvance} onChange={setAutoAdvance} />
          </label>
        </div>
        {blurb && <p className="mt-3 text-[12.5px] text-subtle">{blurb}</p>}

        <div className="mt-5">
          {card ? (
            <CardFrame key={`${card.id}:${nonce}`} card={card} answered={answered}>
              {card.kind === 'choice' && <ChoiceBody card={card} answered={answered} onAnswer={onAnswer} />}
              {card.kind === 'type' && <TypeBody card={card} answered={answered} onAnswer={onAnswer} />}
              {card.kind === 'blank' && <BlankBody card={card} answered={answered} onAnswer={onAnswer} />}
              <Footer
                card={card}
                answered={answered}
                autoAdvance={autoAdvance}
                onReveal={reveal}
                onNext={() => next()}
              />
            </CardFrame>
          ) : (
            <Empty onBack={() => setFocus('all')} />
          )}
        </div>

      </div>
    </div>
  )
}

function ComboChip() {
  const combo = useTrainer((s) => s.combo)
  const best = useTrainer((s) => s.best)
  const hot = combo >= 10
  return (
    <div className="no-drag flex items-center gap-2">
      <Tooltip content="Correct answers in a row">
        <motion.div
          key={combo}
          initial={combo ? { scale: 1.25 } : { x: [0, -4, 4, -2, 0] }}
          animate={{ scale: 1, x: 0 }}
          transition={{ type: 'spring', stiffness: 520, damping: 18 }}
          className={cn(
            'flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold tabular-nums',
            hot ? 'border-medium/40 bg-medium/15 text-medium' : combo ? 'border-border-strong bg-surface text-fg' : 'border-border bg-surface text-subtle'
          )}
        >
          <Flame className={cn('size-3.5', combo ? 'text-medium' : '')} fill={hot ? 'currentColor' : 'none'} />
          {combo}
        </motion.div>
      </Tooltip>
      <Tooltip content="Best combo">
        <div className="flex h-8 items-center gap-1.5 rounded-full px-1 text-[12px] tabular-nums text-subtle">
          <Trophy className="size-3.5" />
          {best}
        </div>
      </Tooltip>
    </div>
  )
}

function CardFrame({ card, answered, children }: { card: Card; answered: Answered | null; children: ReactNode }) {
  const controls = useAnimationControls()
  const result = answered ? (answered.correct ? 'right' : 'wrong') : null
  useEffect(() => {
    if (result === 'wrong') controls.start({ x: [0, -6, 6, -3, 0], transition: { duration: 0.3 } })
  }, [result, controls])
  const cat = CATEGORIES.find((c) => c.id === card.cat)!
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
    >
      <motion.div
        animate={controls}
        className={cn(
          'no-drag relative overflow-hidden rounded-2xl border bg-surface p-6 shadow-sm shadow-black/5 transition-[border-color,box-shadow] duration-200',
          result === 'right' ? 'border-easy/50 shadow-easy/10' : result === 'wrong' ? 'border-hard/50 shadow-hard/10' : 'border-border'
        )}
      >
        <div className="mb-3 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-subtle">
          {cat.label}
          {card.kind === 'blank' && (
            <>
              <span>·</span>
              <span className="normal-case tracking-normal text-muted">{card.title}</span>
            </>
          )}
        </div>
        <div className="text-[16px] font-medium leading-snug">
          <Rich text={card.prompt} />
        </div>
        {card.code && <CodeBlock code={card.code} className="mt-4" />}
        {children}
      </motion.div>
    </motion.div>
  )
}

function Footer({
  card,
  answered,
  autoAdvance,
  onReveal,
  onNext
}: {
  card: Card
  answered: Answered | null
  autoAdvance: boolean
  onReveal: () => void
  onNext: () => void
}) {
  const openProblem = useApp((s) => s.openProblem)
  const final = answered?.final
  const advancing = final && answered.correct && autoAdvance && card.kind !== 'blank'
  return (
    <>
      <AnimatePresence>
        {final && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div
              className={cn(
                'mt-5 flex gap-3 rounded-xl border-l-2 bg-surface-2 px-4 py-3 text-[13px] leading-relaxed text-muted',
                answered.correct ? 'border-easy' : 'border-hard'
              )}
            >
              {answered.correct ? <Check className="mt-0.5 size-4 shrink-0 text-easy" /> : <X className="mt-0.5 size-4 shrink-0 text-hard" />}
              <div className="min-w-0">
                <Rich text={card.explain} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-5 flex items-center gap-2">
        {final ? (
          <Button variant="primary" onClick={onNext}>
            Next <ArrowRight />
            <Kbd className="ml-1 border-transparent bg-black/10 text-current">↵</Kbd>
          </Button>
        ) : (
          <Tooltip content="Counts as a miss" shortcut={['⌘', '.']}>
            <Button variant="ghost" onClick={onReveal}>
              <Eye /> Show answer
            </Button>
          </Tooltip>
        )}
        {card.kind === 'blank' && card.slug && (
          <Button variant="ghost" onClick={() => openProblem(card.slug!)}>
            <SquareArrowOutUpRight /> Open problem
          </Button>
        )}
        <div className="flex-1" />
        {card.kind === 'choice' && !final && <span className="text-[11.5px] text-subtle">Press 1–{card.options.length}</span>}
      </div>

      {advancing && (
        <motion.div
          className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-easy/70"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: ADVANCE_MS / 1000, ease: 'linear' }}
        />
      )}
    </>
  )
}

// ── Choice ──

function shuffled(n: number): number[] {
  const a = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function ChoiceBody({ card, answered, onAnswer }: CardProps<ChoiceCard>) {
  const order = useMemo(() => shuffled(card.options.length), [card])
  const [picked, setPicked] = useState<number | null>(null)
  const mono = card.codeOptions !== false

  const choose = useCallback(
    (i: number) => {
      if (answered) return
      setPicked(i)
      onAnswer(i === card.answer)
    },
    [answered, card.answer, onAnswer]
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.metaKey || e.ctrlKey || e.altKey || typingIn(e.target) || dialogOpen()) return
      const n = Number(e.key)
      if (n >= 1 && n <= order.length) {
        e.preventDefault()
        choose(order[n - 1])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [order, choose])

  return (
    <div className="mt-5 grid gap-2 sm:grid-cols-2">
      {order.map((i, pos) => {
        const isAnswer = i === card.answer
        const state = !answered ? 'idle' : isAnswer ? 'right' : i === picked ? 'wrong' : 'dim'
        return (
          <button
            key={i}
            onClick={() => choose(i)}
            disabled={!!answered}
            className={cn(
              'group flex min-h-11 items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left text-[13.5px] transition-[background,border-color,opacity,transform] duration-150',
              state === 'idle' && 'border-border bg-bg/40 hover:border-border-strong hover:bg-surface-2 active:scale-[0.99]',
              state === 'right' && 'border-easy/60 bg-easy/10',
              state === 'wrong' && 'border-hard/60 bg-hard/10',
              state === 'dim' && 'border-border opacity-45'
            )}
          >
            <span
              className={cn(
                'flex size-5 shrink-0 items-center justify-center rounded-md border text-[11px] font-semibold tabular-nums',
                state === 'right'
                  ? 'border-easy bg-easy text-white'
                  : state === 'wrong'
                    ? 'border-hard bg-hard text-white'
                    : 'border-border bg-surface-2 text-subtle group-hover:text-muted'
              )}
            >
              {state === 'right' ? <Check className="size-3" /> : state === 'wrong' ? <X className="size-3" /> : pos + 1}
            </span>
            <span className={cn('min-w-0 break-words', mono && 'font-mono text-[12.5px]')}>{mono ? card.options[i] : <Rich text={card.options[i]} />}</span>
          </button>
        )
      })}
    </div>
  )
}

// ── Typed answer ──

function TypeBody({ card, answered, onAnswer }: CardProps<TypeCard>) {
  const [value, setValue] = useState('')
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    input.current?.focus()
  }, [])

  const submit = async (): Promise<void> => {
    if (answered || checking || !value.trim()) return
    const typed = normalize(value)
    if ([card.answer, ...(card.accept ?? [])].some((a) => normalize(a) === typed)) return onAnswer(true)
    if (!card.check) return onAnswer(false)
    setChecking(true)
    const checks = Array.isArray(card.check) ? card.check : [card.check]
    let ok = true
    for (const ch of checks) {
      const r = await evaluate(value, ch.setup)
      if (r.error) {
        setError(r.error)
        ok = false
        break
      }
      if (!equal(r.value, ch.expected)) {
        setError(`Got ${show(r.value)}, expected ${show(ch.expected)}${ch.setup ? ` with ${ch.setup}` : ''}`)
        ok = false
        break
      }
    }
    setChecking(false)
    onAnswer(ok)
  }

  const result = answered ? (answered.correct ? 'right' : 'wrong') : null
  return (
    <div className="mt-5">
      <div
        className={cn(
          'flex items-center gap-2 rounded-xl border bg-bg/40 px-3.5 transition-colors focus-within:border-accent/60',
          result === 'right' ? 'border-easy/60 bg-easy/5' : result === 'wrong' ? 'border-hard/60 bg-hard/5' : 'border-border'
        )}
      >
        <input
          ref={input}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !answered) {
              e.preventDefault()
              void submit()
            }
          }}
          readOnly={!!answered || checking}
          placeholder={card.placeholder ?? 'Type your answer…'}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          className="h-11 min-w-0 flex-1 bg-transparent font-mono text-[13.5px] outline-none placeholder:text-subtle"
        />
        {checking ? (
          <Loader2 className="size-4 animate-spin text-subtle" />
        ) : result === 'right' ? (
          <Check className="size-4 text-easy" />
        ) : result === 'wrong' ? (
          <X className="size-4 text-hard" />
        ) : (
          <Kbd>↵</Kbd>
        )}
      </div>
      {answered && !answered.correct && (
        <div className="mt-3 space-y-1.5 text-[13px]">
          {error && <div className="font-mono text-[12px] text-hard/90">{error}</div>}
          <div className="flex items-baseline gap-2">
            <span className="text-subtle">Answer</span>
            <code className="rounded-md border border-border bg-surface-2 px-2 py-0.5 font-mono text-[12.5px] text-fg">{card.answer}</code>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Fill in the blank ──

const PLACEHOLDER = '/* ??? */'

function BlankBody({ card, answered, onAnswer }: CardProps<BlankCard>) {
  const settings = useApp((s) => s.settings)
  const dark = useIsDark()
  const [code, setCode] = useState(() => card.template.replace('___', PLACEHOLDER))
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<RunResult | null>(null)
  const vimStatus = useRef<HTMLDivElement>(null)
  const vim = useRef<{ dispose: () => void } | null>(null)
  const runRef = useRef<() => void>(() => {})

  const lineHeight = Math.round(settings.editorFontSize * 1.6)
  const lines = code.split('\n').length
  const height = Math.min(560, lines * lineHeight + 20)
  const final = !!answered?.final

  const run = async (): Promise<void> => {
    if (busy || final) return
    setBusy(true)
    const r = await runTests(code, card.fn, card.tests, card.unordered)
    setBusy(false)
    setResult(r)
    // Compile errors don't cost the combo; failing tests do, but you can keep fixing it.
    if (r.compile) return
    const pass = !r.error && r.tests.every((t) => t.pass)
    onAnswer(pass, pass)
  }
  runRef.current = run

  useEffect(() => () => vim.current?.dispose(), [])

  // ⌘↵ runs from anywhere, captured before Monaco, whose suggest and find widgets otherwise eat it.
  useEffect(() => {
    if (final) return
    const onKey = (e: KeyboardEvent): void => {
      if (!e.metaKey || e.key !== 'Enter' || dialogOpen()) return
      e.preventDefault()
      e.stopPropagation()
      runRef.current()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [final])

  return (
    <div className="mt-4">
      <div
        className={cn(
          'relative overflow-hidden rounded-xl border bg-bg/40 transition-colors',
          final ? (answered.correct ? 'border-easy/50' : 'border-hard/50') : 'border-border focus-within:border-accent/50'
        )}
      >
        <Editor
          height={height}
          theme={dark ? 'lh-dark' : 'lh-light'}
          language="typescript"
          path={`trainer/${card.id}.ts`}
          value={code}
          onChange={(v) => setCode(v ?? '')}
          onMount={(ed) => {
            const model = ed.getModel()
            const match = model?.findMatches(PLACEHOLDER, false, false, true, null, false)[0]
            if (match) {
              ed.setSelection(match.range)
              ed.revealRangeInCenterIfOutsideViewport(match.range)
              // Grows as you type over the placeholder, so the gap stays highlighted.
              ed.createDecorationsCollection([
                {
                  range: match.range,
                  options: { className: 'trainer-gap', stickiness: monaco.editor.TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges }
                }
              ])
            }
            ed.focus()
            if (useApp.getState().settings.vimMode) vim.current = initVimMode(ed, vimStatus.current)
          }}
          loading={<div className="text-xs text-subtle">Loading editor…</div>}
          options={{
            readOnly: final,
            fontFamily: `'${settings.editorFontFamily}', 'JetBrains Mono Variable', ui-monospace, Menlo, monospace`,
            fontSize: settings.editorFontSize,
            fontLigatures: settings.editorLigatures,
            lineHeight,
            tabSize: 2,
            minimap: { enabled: false },
            lineNumbers: 'off',
            folding: false,
            glyphMargin: false,
            lineDecorationsWidth: 14,
            automaticLayout: true,
            scrollBeyondLastLine: false,
            renderLineHighlight: 'none',
            padding: { top: 10, bottom: 10 },
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8, useShadows: false, alwaysConsumeMouseWheel: false },
            stickyScroll: { enabled: false },
            fixedOverflowWidgets: true,
            contextmenu: false
          }}
        />
        <div
          ref={vimStatus}
          className={settings.vimMode ? 'h-6 border-t border-border bg-surface px-3 font-mono text-[11px] leading-6 text-subtle' : 'hidden'}
        />
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Button size="sm" variant={final ? 'secondary' : 'primary'} onClick={() => void run()} disabled={busy || final}>
          {busy ? <Loader2 className="animate-spin" /> : <Play />}
          Run tests
          <span className="ml-0.5 opacity-70">⌘↵</span>
        </Button>
        {!final && code !== card.template.replace('___', PLACEHOLDER) && (
          <Button size="sm" variant="ghost" onClick={() => setCode(card.template.replace('___', PLACEHOLDER))}>
            <RotateCcw /> Reset
          </Button>
        )}
        {result && !result.error && (
          <span className={cn('text-[12px] font-medium', result.tests.every((t) => t.pass) ? 'text-easy' : 'text-hard')}>
            {result.tests.filter((t) => t.pass).length}/{result.tests.length} passed
            <span className="ml-1.5 font-normal text-subtle">{result.ms}ms</span>
          </span>
        )}
      </div>

      {result && <Results result={result} />}

      {final && !answered.correct && (
        <div className="mt-4">
          <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-subtle">The missing piece</div>
          <CodeBlock code={card.answer} />
        </div>
      )}
    </div>
  )
}

function Results({ result }: { result: RunResult }) {
  if (result.error) {
    return (
      <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-hard/30 bg-hard/5 px-3.5 py-2.5 font-mono text-[12px] text-hard">
        {result.error}
      </pre>
    )
  }
  return (
    <div className="mt-3 space-y-1.5">
      {result.tests.map((t, i) => (
        <div
          key={i}
          className={cn(
            'grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 rounded-xl border px-3.5 py-2 font-mono text-[12px]',
            t.pass ? 'border-border bg-bg/30' : 'border-hard/30 bg-hard/5'
          )}
        >
          <span className={cn('row-span-3 pt-0.5', t.pass ? 'text-easy' : 'text-hard')}>
            {t.pass ? <Check className="size-3.5" /> : <X className="size-3.5" />}
          </span>
          <Row label="input" value={t.args.map(show).join(', ')} />
          {!t.pass && <Row label="expected" value={show(t.expected)} />}
          {!t.pass && <Row label="got" value={t.error ?? show(t.got)} bad />}
        </div>
      ))}
      {result.logs.length > 0 && (
        <pre className="max-h-40 overflow-auto rounded-xl border border-border bg-bg/30 px-3.5 py-2 font-mono text-[12px] text-muted">
          {result.logs.join('\n')}
        </pre>
      )}
    </div>
  )
}

function Row({ label, value, bad }: { label: string; value: string; bad?: boolean }) {
  return (
    <div className="flex min-w-0 gap-2">
      <span className="w-16 shrink-0 text-subtle">{label}</span>
      <span className={cn('min-w-0 truncate', bad ? 'text-hard' : 'text-fg')} title={value}>
        {value}
      </span>
    </div>
  )
}

// ── Shared bits ──

function Empty({ onBack }: { onBack: () => void }) {
  return (
    <div className="no-drag flex flex-col items-center rounded-2xl border border-dashed border-border px-6 py-14 text-center">
      <Trophy className="size-6 text-medium" />
      <div className="mt-3 text-[15px] font-medium">No mistakes to review</div>
      <p className="mt-1 text-[13px] text-muted">Cards you miss land here until you get each one right twice.</p>
      <div className="mt-4">
        <Button onClick={onBack}>Practise all cards</Button>
      </div>
    </div>
  )
}

/** Plain text with `inline code` spans. */
function Rich({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`)/g)
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('`') && p.endsWith('`') && p.length > 1 ? (
          <code key={i} className="rounded-[5px] border border-border bg-surface-2 px-1 py-px font-mono text-[0.88em] text-fg">
            {p.slice(1, -1)}
          </code>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        )
      )}
    </>
  )
}

/** Read-only highlighted TypeScript, using Monaco's tokenizer without a full editor. */
function CodeBlock({ code, className }: { code: string; className?: string }) {
  const ligatures = useApp((s) => s.settings.editorLigatures)
  const [html, setHtml] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    monaco.editor.colorize(code, 'typescript', { tabSize: 2 }).then((h) => live && setHtml(h))
    return () => {
      live = false
    }
  }, [code])
  return (
    <div
      className={cn(
        'trainer-code select-text overflow-x-auto rounded-xl border border-border bg-bg/50 px-4 py-3 font-mono text-[12.5px] leading-[1.65]',
        className
      )}
      style={{ fontVariantLigatures: ligatures ? undefined : 'none' }}
    >
      {html ? <div dangerouslySetInnerHTML={{ __html: html }} /> : <pre>{code}</pre>}
    </div>
  )
}
