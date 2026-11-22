// The in-app assistant: a Claude Agent SDK loop using your Claude Code login. Its tools are
// forwarded to the renderer, which carries them out against the live app (the open problem,
// the editor, Run, generated problems, progress) and sends back a result.
import { app } from 'electron'
import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { dirname, join, sep } from 'node:path'
import { z } from 'zod'
import type { AssistantEvent, AssistantSendRequest, AssistantToolResult } from '@shared/types'
import { Problem, SYSTEM as PROBLEM_GUIDE } from './ai'

type Send = (channel: string, payload: unknown) => void

const MODEL = 'claude-opus-5-5'

const SYSTEM = `You are the assistant inside LeetHelp, a desktop LeetCode client. The user is preparing for coding interviews and solves problems in TypeScript. You are a sharp, friendly interview coach.

You are part of the app, not beside it. You can see and drive it with tools:
- Each user message starts with [Context: …]: the page they're on and the problem open, if any. Use get_code to read their editor; never guess what they wrote.
- search_problems / get_problem find and read LeetCode problems. open_problem opens one in the workspace (do it when you start discussing a specific problem, so the screen follows the conversation).
- create_problem writes an original LeetCode-style problem, verifies its reference solution against its tests, saves it and opens it in the workspace. Use it when the user wants a new or custom problem, or practice on a pattern. If it returns verification errors, fix them and call it again.
- list_generated_problems / open_generated_problem for problems made earlier.
- get_code / set_code read and replace the code in the open editor. run_code runs it on the console's test cases (optionally replacing them first, to try an edge case); submit_code judges a generated problem against all hidden tests. LeetCode problems can only be run, never submitted, by you.
- get_progress, get_study_lists / get_study_list for what they've solved and their study plans (NeetCode 150, Blind 75, …). start_drill opens the quick-fire TypeScript trainer. navigate switches pages.
- ask_user asks a multiple-choice question and waits for the answer in this turn. Use it instead of ending with a question whenever the answer is a choice (which pattern, what difficulty, hint or full answer). Don't ask what you can find out with a tool.

Coaching:
- Default to coaching, not solving. When they're stuck, give the smallest useful hint first (the pattern, an observation, a question), then more if they ask. Give a full solution only when asked or after they've solved it.
- Never overwrite their code unless they ask you to write or fix it. To show an idea, put a short snippet in your reply instead. When you do write into the editor, say so.
- Verify instead of guessing: run their code before saying it's right or wrong, and use run_code with an edge case to show a bug.
- Talk about time and space complexity, edge cases, and what an interviewer would look for. Point out idiomatic TypeScript where it helps.

Style (the chat panel is narrow, about 400px):
- Short: under 80 words unless they ask you to explain in depth. Lead with the answer in a sentence or two, then at most 3 tight bullets or one small code block. No headings, no filler, no restating the question or what a tool card already shows (results and problems appear as cards), no closing offers.
- Markdown is rendered. Code blocks in \`\`\`ts. Keep snippets small; whole solutions belong in the editor.

Writing problems with create_problem follows these rules:
${PROBLEM_GUIDE}`

const viewEnum = z.enum(['problems', 'lists', 'graph', 'progress', 'learn', 'generated'])

/** Tool name → [description, input shape]. Every tool is carried out by the renderer. */
const TOOLS: Record<string, [string, z.ZodRawShape]> = {
  get_app_state: ['What the user is looking at: the page, the open problem, language, sign-in status, and the last run result.', {}],
  search_problems: [
    'Search the LeetCode problem set (about 4,000 problems). Returns id, title, slug, difficulty, acceptance, tags and whether the user has solved it.',
    {
      query: z.string().optional().describe('Words in the title, or a problem number'),
      difficulty: z.enum(['Easy', 'Medium', 'Hard']).optional(),
      tag: z.string().optional().describe('Topic tag, e.g. "sliding-window", "dynamic-programming"'),
      status: z.enum(['solved', 'attempted', 'todo']).optional(),
      limit: z.number().int().min(1).max(50).optional()
    }
  ],
  get_problem: ['Read a LeetCode problem: statement, examples, constraints, hints, tags and the TypeScript starter code.', { slug: z.string() }],
  open_problem: ['Open a LeetCode problem in the workspace.', { slug: z.string() }],
  navigate: ['Switch the app to a page.', { view: viewEnum }],
  get_code: ['The code in the open editor (LeetCode or generated problem), with its language and the console test cases.', {}],
  set_code: [
    'Replace the code in the open editor. Only when the user asked you to write, fix or scaffold code. Their previous code stays in undo history.',
    { code: z.string() }
  ],
  run_code: [
    "Run the open editor's code on the console test cases and return the result. Optionally replace the console cases first: one array per case, one string per parameter, in LeetCode's input format (JSON values, e.g. \"[1,2,3]\").",
    { cases: z.array(z.array(z.string())).optional() }
  ],
  submit_code: ['Judge the open generated problem against all of its hidden tests. Not available for LeetCode problems.', {}],
  create_problem: [
    'Create an original LeetCode-style problem, verify the reference solution passes every test, save it and open it in the workspace with an empty function for the user to solve. Returns the problem id, or verification errors to fix.',
    Problem.shape
  ],
  list_generated_problems: ['Problems created earlier with create_problem or the Generate button, with whether they were solved.', {}],
  open_generated_problem: ['Open a generated problem in the workspace.', { id: z.string() }],
  get_progress: ["The user's LeetCode stats: solved by difficulty, beats %, streak, strongest and weakest topics, recent accepted problems.", {}],
  get_study_lists: ['The study lists in the app (NeetCode 150, Blind 75, …) with progress.', {}],
  get_study_list: ['One study list by id: its sections and each problem with solved status.', { id: z.string() }],
  start_drill: [
    'Open the quick-fire TypeScript trainer on a deck.',
    { focus: z.enum(['all', 'syntax', 'functions', 'logic', 'problems', 'mistakes']) }
  ],
  ask_user: [
    'Ask the user a multiple-choice question and wait for their answer.',
    {
      question: z.string(),
      options: z.array(z.string()).min(2).max(4).describe('Short, concrete choices; the user can also type their own answer')
    }
  ]
}

// ── Tool calls round-trip through the renderer ──

const pending = new Map<string, (r: AssistantToolResult) => void>()

export function toolResult(callId: string, result: AssistantToolResult): void {
  pending.get(callId)?.(result)
}

function forward(send: Send, chatId: string, signal: AbortSignal, name: string) {
  return async (input: Record<string, unknown>) => {
    const callId = randomUUID()
    const r = await new Promise<AssistantToolResult>((resolve) => {
      const onAbort = (): void => finish({ text: 'Stopped by the user.', isError: true })
      const finish = (res: AssistantToolResult): void => {
        pending.delete(callId)
        signal.removeEventListener('abort', onAbort)
        resolve(res)
      }
      signal.addEventListener('abort', onAbort, { once: true })
      pending.set(callId, finish)
      send('assistant:tool', { chatId, callId, name, input })
    })
    return { content: [{ type: 'text' as const, text: r.text }], isError: r.isError }
  }
}

// ── Chats ──

const running = new Map<string, AbortController>()

export function stop(chatId: string): void {
  running.get(chatId)?.abort()
}

/** In the packaged app the SDK's bundled `claude` binary is unpacked beside the asar archive. */
function claudeBinary(): string | undefined {
  if (!app.isPackaged) return undefined
  try {
    const pkg = require.resolve(`@anthropic-ai/claude-agent-sdk-${process.platform}-${process.arch}/package.json`)
    const bin = join(dirname(pkg), 'claude').replace(`app.asar${sep}`, `app.asar.unpacked${sep}`)
    return existsSync(bin) ? bin : undefined
  } catch {
    return undefined
  }
}

function friendly(msg: string): string {
  if (/not logged in|\/login|authenticat|invalid api key/i.test(msg))
    return 'Claude Code isn’t signed in. Run `claude` in a terminal and log in, then try again.'
  return msg
}

export async function send(req: AssistantSendRequest, sendToRenderer: Send): Promise<void> {
  const { chatId } = req
  running.get(chatId)?.abort()
  const ac = new AbortController()
  running.set(chatId, ac)
  let finished = false
  const emit = (event: AssistantEvent): void => {
    if (finished) return
    if (event.type === 'done') finished = true
    sendToRenderer('assistant:event', { chatId, event })
  }

  try {
    const { query, tool, createSdkMcpServer } = await import('@anthropic-ai/claude-agent-sdk')
    const server = createSdkMcpServer({
      name: 'leethelp',
      version: '1.0.0',
      tools: Object.entries(TOOLS).map(([name, [desc, shape]]) => tool(name, desc, shape, forward(sendToRenderer, chatId, ac.signal, name)))
    })
    const cwd = join(app.getPath('userData'), 'assistant')
    await mkdir(cwd, { recursive: true })
    const bin = claudeBinary()

    // Custom tools need streaming input.
    async function* prompt() {
      yield { type: 'user' as const, message: { role: 'user' as const, content: req.message }, parent_tool_use_id: null, session_id: '' }
    }

    const q = query({
      prompt: prompt(),
      options: {
        model: MODEL,
        effort: 'medium',
        systemPrompt: SYSTEM,
        mcpServers: { leethelp: server },
        // No built-in tools (files, shell, web): only the app's own.
        tools: [],
        allowedTools: Object.keys(TOOLS).map((n) => `mcp__leethelp__${n}`),
        settingSources: [],
        includePartialMessages: true,
        resume: req.sessionId,
        maxTurns: 40,
        cwd,
        abortController: ac,
        ...(bin ? { pathToClaudeCodeExecutable: bin } : {})
      }
    })

    let sawText = false
    for await (const m of q) {
      if (m.type === 'system' && m.subtype === 'init') emit({ type: 'session', id: m.session_id })
      else if (m.type === 'stream_event') {
        const ev = m.event
        if (ev.type === 'content_block_start' && ev.content_block.type === 'text' && sawText) emit({ type: 'text-break' })
        if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') {
          sawText = true
          emit({ type: 'text', text: ev.delta.text })
        }
      } else if (m.type === 'result') {
        const error =
          m.subtype === 'success'
            ? m.is_error
              ? friendly(m.result)
              : undefined
            : m.subtype === 'error_max_turns'
              ? 'Stopped after too many steps.'
              : 'Something went wrong in the assistant.'
        emit({ type: 'done', costUsd: m.total_cost_usd, error })
      }
    }
    emit({ type: 'done' })
  } catch (e) {
    emit({ type: 'done', error: ac.signal.aborted ? 'stopped' : friendly((e as Error).message) })
  } finally {
    if (running.get(chatId) === ac) running.delete(chatId)
  }
}
