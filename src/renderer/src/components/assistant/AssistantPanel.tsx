import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { create } from 'zustand'
import {
  ArrowUp,
  Check,
  CheckCircle2,
  ChevronRight,
  History,
  Loader2,
  Plus,
  Sparkles,
  Square,
  Trash2,
  X,
  XCircle,
  CircleAlert,
  FileCode2
} from 'lucide-react'
import { useApp } from '@/lib/store'
import { cn } from '@/lib/utils'
import { activeWorkspace } from '@/lib/workspace-bridge'
import { answerQuestion, isPending, useAssistant, type AiMsg, type Part, type Thread } from '@/lib/assistant'
import { Button } from '../ui/button'
import { Kbd } from '../ui/kbd'
import { Tooltip } from '../ui/tooltip'
import { DifficultyPill } from '../DifficultyPill'
import { Markdown } from './Markdown'

// ── Width (drag the left edge) ──

const MIN_WIDTH = 320
const MAX_WIDTH = 760
const WIDTH_KEY = 'assistant.width'

function savedWidth(): number {
  try {
    const n = Number(localStorage.getItem(WIDTH_KEY))
    return n >= MIN_WIDTH && n <= MAX_WIDTH ? n : 400
  } catch {
    return 400
  }
}

/** Kept apart from the persisted chat store so dragging doesn't rewrite the chats on every move. */
export const useAssistantWidth = create<{ width: number; resizing: boolean }>(() => ({ width: savedWidth(), resizing: false }))

function startResize(e: React.PointerEvent): void {
  e.preventDefault()
  const startX = e.clientX
  const startW = useAssistantWidth.getState().width
  // Pointer coordinates are in screen px; widths are in CSS px under the interface scale.
  const scale = useApp.getState().settings.uiScale || 1
  const max = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, window.innerWidth / scale - 560))
  useAssistantWidth.setState({ resizing: true })
  document.body.style.cursor = 'col-resize'
  const move = (ev: PointerEvent): void => {
    const w = Math.round(startW - (ev.clientX - startX) / scale)
    useAssistantWidth.setState({ width: Math.min(max, Math.max(MIN_WIDTH, w)) })
  }
  const up = (): void => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    document.body.style.cursor = ''
    useAssistantWidth.setState({ resizing: false })
    try {
      localStorage.setItem(WIDTH_KEY, String(useAssistantWidth.getState().width))
    } catch {}
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}

export function AssistantPanel() {
  const threads = useAssistant((s) => s.threads)
  const activeId = useAssistant((s) => s.activeId)
  const running = useAssistant((s) => s.running)
  const setOpen = useAssistant((s) => s.setOpen)
  const newThread = useAssistant((s) => s.newThread)
  const thread = threads.find((t) => t.id === activeId) ?? null
  const [history, setHistory] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const focusAt = useAssistant((s) => s.focus?.at)
  const width = useAssistantWidth((s) => s.width)

  // Jumping to a problem's chat should show the chat, not the history list.
  useEffect(() => {
    if (focusAt) setHistory(false)
  }, [focusAt])

  // Focus the input whenever the panel opens or the thread changes.
  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [activeId])

  return (
    <aside className="relative flex h-full flex-col border-l border-border bg-[var(--sidebar)]" style={{ width }}>
      <div
        onPointerDown={startResize}
        className="no-drag absolute inset-y-0 left-0 z-20 w-1.5 cursor-col-resize transition-colors hover:bg-accent/40"
      />
      <header className="drag flex h-[46px] shrink-0 items-center gap-1 border-b border-border pl-4 pr-2">
        <Sparkles className="size-3.5 text-accent" />
        <span className="ml-1 min-w-0 flex-1 truncate text-[13px] font-semibold">
          {thread ? thread.title : 'Assistant'}
        </span>
        <div className="no-drag flex items-center gap-0.5">
          <Tooltip content="History">
            <Button variant="ghost" size="iconSm" onClick={() => setHistory((h) => !h)} className={history ? 'bg-surface-2 text-fg' : ''}>
              <History />
            </Button>
          </Tooltip>
          <Tooltip content="New chat">
            <Button
              variant="ghost"
              size="iconSm"
              disabled={!!running}
              onClick={() => {
                newThread()
                setHistory(false)
                inputRef.current?.focus()
              }}
            >
              <Plus />
            </Button>
          </Tooltip>
          <Tooltip content="Close" shortcut={['⌘', 'J']}>
            <Button variant="ghost" size="iconSm" onClick={() => setOpen(false)}>
              <X />
            </Button>
          </Tooltip>
        </div>
      </header>

      {history ? (
        <HistoryList onPick={() => setHistory(false)} />
      ) : (
        <>
          <Messages thread={thread} running={running === thread?.id} onPrompt={(p) => useAssistant.getState().send(p)} />
          <Composer inputRef={inputRef} />
        </>
      )}
    </aside>
  )
}

// ── Messages ──

function Messages({ thread, running, onPrompt }: { thread: Thread | null; running: boolean; onPrompt: (p: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const stick = useRef(true)
  const last = thread?.msgs[thread.msgs.length - 1]
  const lastSize = last ? (last.role === 'ai' ? JSON.stringify(last.parts).length : last.text.length) : 0
  const focus = useAssistant((s) => s.focus)

  // Follow the reply as it streams, unless the user scrolled up.
  useLayoutEffect(() => {
    const el = ref.current
    if (el && stick.current) el.scrollTop = el.scrollHeight
  }, [thread?.id, thread?.msgs.length, lastSize])

  // "Open chat" from a generated problem: scroll to the card where it was created and flash it.
  useEffect(() => {
    const el = ref.current
    if (!el || !focus || focus.threadId !== thread?.id) return
    const card = el.querySelector<HTMLElement>(`[data-problem-id="${CSS.escape(focus.problemId)}"]`)
    if (!card) return
    stick.current = false
    card.scrollIntoView({ block: 'center' })
    card.classList.add('ring-2', 'ring-accent')
    const t = setTimeout(() => card.classList.remove('ring-2', 'ring-accent'), 1600)
    useAssistant.setState({ focus: null })
    return () => clearTimeout(t)
  }, [focus, thread?.id])

  if (!thread || thread.msgs.length === 0) return <Welcome onPrompt={onPrompt} />

  return (
    <div
      ref={ref}
      onScroll={(e) => {
        const el = e.currentTarget
        stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40
      }}
      className="min-h-0 flex-1 overflow-y-auto px-4 py-4"
    >
      <div className="space-y-4">
        {thread.msgs.map((m, i) =>
          m.role === 'user' ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[85%] select-text whitespace-pre-wrap rounded-2xl rounded-br-md bg-accent-soft px-3.5 py-2 text-[13px] leading-relaxed text-fg">
                {m.text}
              </div>
            </div>
          ) : (
            <AiMessage key={i} msg={m} threadId={thread.id} live={running && i === thread.msgs.length - 1} />
          )
        )}
      </div>
    </div>
  )
}

function AiMessage({ msg, threadId, live }: { msg: AiMsg; threadId: string; live: boolean }) {
  const visible = msg.parts.filter((p) => !(p.kind === 'text' && !p.text.trim()))
  return (
    <div className="space-y-2 text-[13px] leading-relaxed">
      {visible.map((p, i) => (
        <PartView key={i} part={p} threadId={threadId} />
      ))}
      {live && (visible.length === 0 || visible[visible.length - 1].kind !== 'text') && (
        <div className="flex items-center gap-2 text-[12px] text-subtle">
          <motion.span
            className="size-1.5 rounded-full bg-accent"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
          />
          Thinking…
        </div>
      )}
      {msg.error && (
        <div className={cn('flex items-center gap-1.5 text-[12px]', msg.error === 'Stopped' ? 'text-subtle' : 'text-hard')}>
          {msg.error !== 'Stopped' && <CircleAlert className="size-3.5 shrink-0" />}
          {msg.error}
        </div>
      )}
    </div>
  )
}

function PartView({ part, threadId }: { part: Part; threadId: string }) {
  const openProblem = useApp((s) => s.openProblem)
  const openCustom = useApp((s) => s.openCustom)
  switch (part.kind) {
    case 'text':
      return <Markdown text={part.text} />
    case 'step':
      return (
        <div className="flex items-center gap-1.5 text-[12px] text-subtle">
          {part.state === 'running' ? (
            <Loader2 className="size-3 animate-spin" />
          ) : part.state === 'error' ? (
            <X className="size-3 text-hard" />
          ) : (
            <Check className="size-3" />
          )}
          {part.label}
        </div>
      )
    case 'problem':
      return (
        <button
          data-problem-id={part.source === 'custom' ? part.id : undefined}
          onClick={() => (part.source === 'leetcode' ? openProblem(part.id) : openCustom(part.id))}
          className="flex w-full items-center gap-2.5 rounded-xl border border-border bg-surface px-3 py-2.5 text-left transition-colors hover:border-border-strong"
        >
          {part.source === 'custom' ? <Sparkles className="size-3.5 shrink-0 text-accent" /> : <FileCode2 className="size-3.5 shrink-0 text-muted" />}
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{part.title}</span>
          <DifficultyPill difficulty={part.difficulty} />
          <ChevronRight className="size-3.5 text-subtle" />
        </button>
      )
    case 'result':
      return (
        <div
          className={cn(
            'flex items-center gap-2 rounded-xl border px-3 py-2',
            part.good ? 'border-easy/30 bg-easy/[0.06]' : 'border-hard/30 bg-hard/[0.06]'
          )}
        >
          {part.good ? <CheckCircle2 className="size-3.5 shrink-0 text-easy" /> : <XCircle className="size-3.5 shrink-0 text-hard" />}
          <span className={cn('font-medium', part.good ? 'text-easy' : 'text-hard')}>{part.title}</span>
          {part.detail && <span className="min-w-0 truncate text-[12px] text-subtle">{part.detail}</span>}
        </div>
      )
    case 'question':
      return <QuestionCard part={part} threadId={threadId} />
  }
}

function QuestionCard({ part, threadId }: { part: Extract<Part, { kind: 'question' }>; threadId: string }) {
  const [other, setOther] = useState('')
  const live = !part.answer && isPending(part.id)
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="text-[13px] font-medium">{part.question}</div>
      <div className="mt-2 flex flex-col gap-1">
        {part.options.map((o, i) => (
          <button
            key={o}
            disabled={!live}
            onClick={() => answerQuestion(threadId, part.id, o)}
            className={cn(
              'flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-[12.5px] transition-colors',
              part.answer === o
                ? 'border-accent bg-accent-soft text-fg'
                : live
                  ? 'border-border hover:border-border-strong hover:bg-surface-2'
                  : 'border-border text-subtle'
            )}
          >
            <Kbd>{i + 1}</Kbd>
            {o}
          </button>
        ))}
      </div>
      {live && (
        <form
          className="mt-1.5"
          onSubmit={(e) => {
            e.preventDefault()
            if (other.trim()) answerQuestion(threadId, part.id, other.trim())
          }}
        >
          <input
            value={other}
            onChange={(e) => setOther(e.target.value)}
            placeholder="Something else…"
            className="h-8 w-full rounded-lg border border-border bg-surface-2 px-2.5 text-[12.5px] outline-none focus:border-accent/60"
          />
        </form>
      )}
      {part.answer && !part.options.includes(part.answer) && (
        <div className="mt-1.5 rounded-lg border border-accent bg-accent-soft px-2.5 py-1.5 text-[12.5px]">{part.answer}</div>
      )}
    </div>
  )
}

// ── Empty state ──

function Welcome({ onPrompt }: { onPrompt: (p: string) => void }) {
  const view = useApp((s) => s.view)
  const slug = useApp((s) => s.slug)
  const customId = useApp((s) => s.customId)
  // Re-evaluated when the page or problem changes.
  void slug
  void customId
  const ws = activeWorkspace()
  const prompts = ws
    ? ['Give me a hint, not the answer', 'Review my code', 'What would an interviewer look for here?', 'Make me a similar problem to practise']
    : [
        'Make me a Medium sliding window problem',
        'What should I practise next?',
        "Pick a NeetCode 150 problem I haven't solved",
        'Explain when to use a monotonic stack'
      ]
  return (
    <div className="flex min-h-0 flex-1 flex-col justify-end overflow-y-auto px-4 pb-4">
      <div className="mb-4">
        <div className="flex size-9 items-center justify-center rounded-xl bg-accent-soft">
          <Sparkles className="size-4 text-accent" />
        </div>
        <div className="mt-3 text-[15px] font-semibold tracking-tight">
          {ws ? `Working on ${ws.title}?` : 'Your interview coach'}
        </div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
          {ws
            ? 'I can see your code and run it. Ask for a hint, a review, or a new problem on the same idea.'
            : `I can find problems, write new ones for you, open them, read your code and run it, all from this chat${view === 'progress' ? ', and look at your progress' : ''}.`}
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        {prompts.map((p) => (
          <button
            key={p}
            onClick={() => onPrompt(p)}
            className="rounded-xl border border-border bg-surface/70 px-3 py-2 text-left text-[12.5px] text-muted transition-colors hover:border-border-strong hover:text-fg"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── History ──

function HistoryList({ onPick }: { onPick: () => void }) {
  const threads = useAssistant((s) => s.threads)
  const activeId = useAssistant((s) => s.activeId)
  const select = useAssistant((s) => s.select)
  const remove = useAssistant((s) => s.remove)
  const running = useAssistant((s) => s.running)
  if (threads.length === 0) return <div className="flex flex-1 items-center justify-center text-[12.5px] text-subtle">No chats yet.</div>
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-2">
      {threads.map((t) => (
        <div
          key={t.id}
          role="button"
          tabIndex={0}
          onClick={() => {
            select(t.id)
            onPick()
          }}
          className={cn(
            'group flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-[12.5px] transition-colors',
            t.id === activeId ? 'bg-surface text-fg ring-1 ring-border' : 'text-muted hover:bg-surface/60 hover:text-fg'
          )}
        >
          <span className="min-w-0 flex-1 truncate">{t.title}</span>
          <span className="shrink-0 text-[11px] text-subtle">{ago(t.at)}</span>
          {running !== t.id && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                remove(t.id)
              }}
              className="hidden size-5 items-center justify-center rounded text-subtle hover:text-hard group-hover:flex"
            >
              <Trash2 className="size-3" />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

const ago = (t: number): string => {
  const m = Math.round((Date.now() - t) / 60_000)
  return m < 1 ? 'now' : m < 60 ? `${m}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`
}

// ── Input ──

function Composer({ inputRef }: { inputRef: React.RefObject<HTMLTextAreaElement | null> }) {
  const [text, setText] = useState('')
  const running = useAssistant((s) => s.running)
  const send = useAssistant((s) => s.send)
  const stop = useAssistant((s) => s.stop)
  const view = useApp((s) => s.view)
  const slug = useApp((s) => s.slug)
  const customId = useApp((s) => s.customId)
  void slug
  void customId
  const ws = activeWorkspace()

  useLayoutEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [text, inputRef])

  const submit = (): void => {
    if (!text.trim() || running) return
    send(text)
    setText('')
  }

  return (
    <div className="shrink-0 px-3 pb-3">
      <div className="rounded-2xl border border-border bg-surface shadow-sm shadow-black/[0.03] focus-within:border-border-strong">
        <textarea
          ref={inputRef}
          value={text}
          rows={1}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              submit()
            }
          }}
          placeholder={ws ? 'Ask about this problem…' : 'Ask anything, or ask for a problem…'}
          className="block max-h-40 w-full resize-none bg-transparent px-3.5 pt-3 text-[13px] leading-relaxed outline-none placeholder:text-subtle"
        />
        <div className="flex items-center gap-2 px-2.5 pb-2 pt-1">
          <span className="flex min-w-0 flex-1 items-center gap-1 truncate text-[11px] text-subtle">
            {ws ? (
              <>
                <FileCode2 className="size-3 shrink-0" />
                <span className="truncate">{ws.title}</span>
              </>
            ) : (
              <span className="capitalize">{view === 'graph' ? 'Explore' : view}</span>
            )}
          </span>
          {running ? (
            <Tooltip content="Stop">
              <button onClick={stop} className="flex size-7 items-center justify-center rounded-full bg-fg text-bg">
                <Square className="size-2.5 fill-current" />
              </button>
            </Tooltip>
          ) : (
            <button
              onClick={submit}
              disabled={!text.trim()}
              className="flex size-7 items-center justify-center rounded-full bg-accent text-accent-fg transition-opacity disabled:opacity-35"
            >
              <ArrowUp className="size-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
