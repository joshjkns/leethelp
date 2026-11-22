// The assistant's chat threads, and the glue between the agent loop in the main process and the
// app: streamed text lands in the open thread, and tool calls are carried out here (see assistant-tools).
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AssistantEvent, AssistantToolCall, Difficulty } from '@shared/types'
import { useApp } from './store'
import { activeWorkspace } from './workspace-bridge'
import { useCustomProblems } from './custom-problems'
import { runTool, stepLabel } from './assistant-tools'

export type Part =
  | { kind: 'text'; text: string }
  | { kind: 'step'; label: string; state: 'running' | 'done' | 'error' }
  | { kind: 'problem'; source: 'leetcode' | 'custom'; id: string; title: string; difficulty: Difficulty }
  | { kind: 'result'; title: string; good: boolean; detail?: string }
  | { kind: 'question'; id: string; question: string; options: string[]; answer?: string }

export interface UserMsg {
  role: 'user'
  text: string
  at: number
}
export interface AiMsg {
  role: 'ai'
  parts: Part[]
  start: number
  end?: number
  error?: string
}
export type Msg = UserMsg | AiMsg

export interface Thread {
  id: string
  title: string
  /** The Claude session to resume, so the conversation keeps its memory. */
  sessionId?: string
  msgs: Msg[]
  at: number
}

interface State {
  threads: Thread[]
  activeId: string | null
  open: boolean
  /** Thread whose turn is in progress. */
  running: string | null
  /** A problem card to scroll to and highlight in the open thread (set by openChatFor). */
  focus: { threadId: string; problemId: string; at: number } | null
  setOpen: (o: boolean) => void
  newThread: () => void
  select: (id: string) => void
  remove: (id: string) => void
  send: (text: string) => void
  stop: () => void
  /** Opens the chat a generated problem came from, scrolled to where it was created. */
  openChatFor: (problemId: string) => boolean
}

const MAX_THREADS = 30
const newId = (): string => `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

export const useAssistant = create<State>()(
  persist(
    (set, get) => ({
      threads: [],
      activeId: null,
      open: false,
      running: null,
      focus: null,
      openChatFor: (problemId) => {
        const threadId = chatFor(problemId, get().threads)
        if (!threadId) return false
        set({ open: true, activeId: threadId, focus: { threadId, problemId, at: Date.now() } })
        return true
      },
      setOpen: (open) => set({ open }),
      newThread: () => set({ activeId: null }),
      select: (activeId) => set({ activeId }),
      remove: (id) => set((s) => ({ threads: s.threads.filter((t) => t.id !== id), activeId: s.activeId === id ? null : s.activeId })),

      send: (text) => {
        const msg = text.trim()
        if (!msg || get().running) return
        let id = get().activeId
        if (!id || !get().threads.some((t) => t.id === id)) {
          id = newId()
          const t: Thread = { id, title: msg.length > 48 ? `${msg.slice(0, 46)}…` : msg, msgs: [], at: Date.now() }
          set((s) => ({ threads: [t, ...s.threads].slice(0, MAX_THREADS), activeId: id }))
        }
        const thread = get().threads.find((t) => t.id === id)!
        update(id, (t) => ({
          ...t,
          at: Date.now(),
          msgs: [...t.msgs, { role: 'user', text: msg, at: Date.now() }, { role: 'ai', parts: [], start: Date.now() }]
        }))
        set({ running: id, open: true })
        window.api.assistantSend({ chatId: id, message: `${describeContext()}\n\n${msg}`, sessionId: thread.sessionId }).catch((e: Error) =>
          finish(id!, e.message)
        )
      },

      stop: () => {
        const id = get().running
        if (!id) return
        window.api.assistantStop(id)
        for (const [, resolve] of questions) resolve(null)
        questions.clear()
      }
    }),
    {
      name: 'assistant.v1',
      partialize: (s) => ({ threads: s.threads, activeId: s.activeId, open: s.open })
    }
  )
)

// ── Linking generated problems to chats ──

const hasCard = (t: Thread, problemId: string): boolean =>
  t.msgs.some((m) => m.role === 'ai' && m.parts.some((p) => p.kind === 'problem' && p.source === 'custom' && p.id === problemId))

/**
 * The chat a generated problem came from: the one recorded when the assistant created it, or, for
 * problems made before that was recorded, the oldest chat that shows its card.
 */
export function chatFor(problemId: string, threads: Thread[]): string | null {
  const recorded = useCustomProblems.getState().problems.find((p) => p.id === problemId)?.chatId
  if (recorded && threads.some((t) => t.id === recorded)) return recorded
  const withCard = threads.filter((t) => hasCard(t, problemId))
  return withCard.length ? withCard.reduce((a, b) => (a.at <= b.at ? a : b)).id : null
}

/** Reactive chatFor, for showing an "Open chat" button. */
export const useChatFor = (problemId: string | null): string | null =>
  useAssistant((s) => (problemId ? chatFor(problemId, s.threads) : null))

// ── Updating threads ──

function update(id: string, fn: (t: Thread) => Thread): void {
  useAssistant.setState((s) => ({ threads: s.threads.map((t) => (t.id === id ? fn(t) : t)) }))
}

/** Changes the last (in-progress) AI message of a thread. */
function updateAi(id: string, fn: (m: AiMsg) => AiMsg): void {
  update(id, (t) => {
    const i = t.msgs.length - 1
    const last = t.msgs[i]
    if (!last || last.role !== 'ai') return t
    const msgs = t.msgs.slice()
    msgs[i] = fn(last)
    return { ...t, msgs }
  })
}

export function pushPart(id: string, part: Part): void {
  updateAi(id, (m) => ({ ...m, parts: [...m.parts, part] }))
}

function finish(id: string, error?: string): void {
  updateAi(id, (m) => ({
    ...m,
    end: Date.now(),
    error: error === 'stopped' ? 'Stopped' : error,
    parts: m.parts.map((p) => (p.kind === 'step' && p.state === 'running' ? { ...p, state: 'done' } : p))
  }))
  if (useAssistant.getState().running === id) useAssistant.setState({ running: null })
}

function onEvent(id: string, e: AssistantEvent): void {
  if (e.type === 'session') update(id, (t) => ({ ...t, sessionId: e.id }))
  else if (e.type === 'text')
    updateAi(id, (m) => {
      const last = m.parts[m.parts.length - 1]
      if (last?.kind === 'text') return { ...m, parts: [...m.parts.slice(0, -1), { kind: 'text', text: last.text + e.text }] }
      return { ...m, parts: [...m.parts, { kind: 'text', text: e.text }] }
    })
  else if (e.type === 'text-break') updateAi(id, (m) => ({ ...m, parts: [...m.parts, { kind: 'text', text: '' }] }))
  else if (e.type === 'done') finish(id, e.error)
}

async function onTool(call: AssistantToolCall): Promise<void> {
  const label = stepLabel(call.name, call.input)
  let stepIndex = -1
  if (label) {
    updateAi(call.chatId, (m) => {
      stepIndex = m.parts.length
      return { ...m, parts: [...m.parts, { kind: 'step', label, state: 'running' }] }
    })
  }
  const setStep = (state: 'done' | 'error'): void => {
    if (stepIndex < 0) return
    updateAi(call.chatId, (m) => ({
      ...m,
      parts: m.parts.map((p, i) => (i === stepIndex && p.kind === 'step' ? { ...p, state } : p))
    }))
  }
  try {
    const r = await runTool(call.name, call.input, { chatId: call.chatId, push: (p) => pushPart(call.chatId, p), ask: (q, o) => ask(call.chatId, q, o) })
    setStep(r.isError ? 'error' : 'done')
    window.api.assistantToolResult(call.callId, r)
  } catch (e) {
    setStep('error')
    window.api.assistantToolResult(call.callId, { text: (e as Error).message, isError: true })
  }
}

// ── Questions (ask_user) ──

const questions = new Map<string, (answer: string | null) => void>()

function ask(chatId: string, question: string, options: string[]): Promise<string | null> {
  const id = newId()
  pushPart(chatId, { kind: 'question', id, question, options })
  return new Promise((resolve) => questions.set(id, resolve))
}

/** The user picked (or typed) an answer to a question card. */
export function answerQuestion(threadId: string, questionId: string, answer: string): void {
  const resolve = questions.get(questionId)
  if (!resolve) return
  questions.delete(questionId)
  update(threadId, (t) => ({
    ...t,
    msgs: t.msgs.map((m) =>
      m.role === 'ai' ? { ...m, parts: m.parts.map((p) => (p.kind === 'question' && p.id === questionId ? { ...p, answer } : p)) } : m
    )
  }))
  resolve(answer)
}

export const isPending = (questionId: string): boolean => questions.has(questionId)

// ── Context sent with every message ──

function describeContext(): string {
  const s = useApp.getState()
  const bits = [`page: ${s.view === 'custom' ? 'workspace (generated problem)' : s.view}`]
  const ws = activeWorkspace()
  if (ws?.kind === 'leetcode') {
    const p = s.bySlug.get(ws.id)
    bits.push(
      `open problem: "${ws.title}" (slug ${ws.id}, ${p?.difficulty ?? '?'}, ${p?.status === 'ac' ? 'solved' : p?.status === 'notac' ? 'attempted' : 'unsolved'})`,
      `language: ${ws.lang}`
    )
  } else if (ws?.kind === 'custom') {
    const p = useCustomProblems.getState().problems.find((x) => x.id === ws.id)
    bits.push(`open generated problem: "${ws.title}" (id ${ws.id}, ${p?.difficulty ?? '?'}, ${p?.status === 'ac' ? 'solved' : 'unsolved'})`)
  }
  bits.push(s.user.signedIn ? `signed in to LeetCode as ${s.user.username}` : 'not signed in to LeetCode (can’t run LeetCode problems)')
  return `[Context: ${bits.join('; ')}]`
}

// ── Wiring ──

let wired = false
export function initAssistant(): void {
  if (wired) return
  wired = true
  // A turn can't survive a reload; tidy up any left running.
  for (const t of useAssistant.getState().threads) {
    const last = t.msgs[t.msgs.length - 1]
    if (last?.role === 'ai' && !last.end) finish(t.id, 'Interrupted')
  }
  useAssistant.setState({ running: null })
  window.api.onAssistantEvent(onEvent)
  window.api.onAssistantTool((c) => void onTool(c))
}
