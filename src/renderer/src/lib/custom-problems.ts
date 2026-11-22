// AI-generated LeetCode-style problems: requested from the main process, verified here by running
// the reference solution against every test, and judged locally when you Run or Submit.
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Difficulty, GeneratedProblem, ProblemDetail, ProblemStatus, RunResult } from '@shared/types'
import type { TestCase as ConsoleCase } from '@/components/workspace/Console'
import { runTests, type RunResult as LocalRun } from './trainer/runner'
import type { TestCase } from './trainer/types'

export interface CustomProblem extends GeneratedProblem {
  id: string
  topic: string
  createdAt: number
  status: ProblemStatus
  /** The assistant chat that created it, if any (see chatFor in assistant.ts). */
  chatId?: string
}

interface CustomState {
  problems: CustomProblem[]
  add: (p: CustomProblem) => void
  remove: (id: string) => void
  setStatus: (id: string, status: ProblemStatus) => void
}

export const useCustomProblems = create<CustomState>()(
  persist(
    (set, get) => ({
      problems: [],
      add: (p) => set({ problems: [p, ...get().problems] }),
      remove: (id) => {
        set({ problems: get().problems.filter((p) => p.id !== id) })
        localStorage.removeItem(draftKey(id))
      },
      setStatus: (id, status) => set({ problems: get().problems.map((p) => (p.id === id ? { ...p, status } : p)) })
    }),
    { name: 'custom-problems.v1' }
  )
)

export const draftKey = (id: string): string => `code:${id}:typescript`

// ── Generation and verification ──

const IDENT = /^[A-Za-z_$][\w$]*$/
const MAX_ATTEMPTS = 2

const parseTests = (p: GeneratedProblem): TestCase[] =>
  p.tests.map((t) => ({ args: JSON.parse(t.argsJson), expected: JSON.parse(t.expectedJson) }))

/** Checks a generated problem's shape, then runs its reference solution against every test. */
export async function verify(gen: GeneratedProblem): Promise<{ problem: GeneratedProblem } | { errors: string[] }> {
  const errors: string[] = []
  if (!IDENT.test(gen.fn)) errors.push(`\`fn\` must be a function name, got "${gen.fn}".`)
  else if (!new RegExp(`function\\s+${gen.fn}\\s*[(<]`).test(gen.solution))
    errors.push(`The solution doesn't declare \`function ${gen.fn}\`.`)
  const badParam = gen.params.find((p) => !IDENT.test(p.name))
  if (badParam) errors.push(`Parameter name "${badParam.name}" isn't a valid identifier.`)
  if (gen.tests.length < 6) errors.push(`Only ${gen.tests.length} tests; write 10 to 15.`)

  gen.tests.forEach((t, i) => {
    try {
      const args = JSON.parse(t.argsJson)
      JSON.parse(t.expectedJson)
      if (!Array.isArray(args)) errors.push(`Test ${i + 1}: argsJson must be a JSON array.`)
      else if (args.length !== gen.params.length)
        errors.push(`Test ${i + 1} has ${args.length} arguments but the function takes ${gen.params.length}.`)
    } catch (e) {
      errors.push(`Test ${i + 1} isn't valid JSON (${(e as Error).message}).`)
    }
  })
  if (errors.length) return { errors }

  // Examples first; if none were marked, show the first two.
  let tests = [...gen.tests.filter((t) => t.example), ...gen.tests.filter((t) => !t.example)]
  if (!tests.some((t) => t.example)) tests = tests.map((t, i) => ({ ...t, example: i < 2 }))
  const problem = { ...gen, tests }

  const r = await runTests(problem.solution, problem.fn, parseTests(problem), problem.unordered)
  if (r.error) return { errors: [`The reference solution doesn't run: ${r.error}`] }
  r.tests.forEach((t, i) => {
    if (!t.pass)
      errors.push(
        `Test ${i + 1} fails against the reference solution: args ${JSON.stringify(t.args)} expected ${JSON.stringify(t.expected)} but the solution returns ${t.error ?? JSON.stringify(t.got)}.`
      )
  })
  return errors.length ? { errors } : { problem }
}

/** A verified problem, ready to save. */
export function finalize(p: GeneratedProblem, topic: string): CustomProblem {
  const slug = p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return { ...p, id: `custom-${slug}-${Date.now().toString(36)}`, topic, createdAt: Date.now(), status: null }
}

export type Stage = { step: 'generating' | 'verifying'; attempt: number }

/** Generates and verifies a problem, retrying once with the verification errors. */
export async function generateProblem(topic: string, difficulty: Difficulty, onStage: (s: Stage) => void): Promise<CustomProblem> {
  let retry: { previous: GeneratedProblem; errors: string[] } | undefined
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    onStage({ step: 'generating', attempt })
    const gen = await window.api.generateProblem({ topic, difficulty, retry })
    onStage({ step: 'verifying', attempt })
    const r = await verify(gen)
    if ('problem' in r) return finalize(r.problem, topic)
    retry = { previous: gen, errors: r.errors }
  }
  throw new Error(`The generated problem kept failing its own tests:\n${retry!.errors.join('\n')}`)
}

// ── Workspace adapters ──

export const starterCode = (p: GeneratedProblem): string =>
  `function ${p.fn}(${p.params.map((x) => `${x.name}: ${x.type}`).join(', ')}): ${p.returnType} {\n  \n}\n`

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
/** Escaped text with `inline code`. */
const inline = (s: string): string =>
  esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
const json = (v: unknown): string => JSON.stringify(v)

function contentHtml(p: GeneratedProblem): string {
  const paras = p.statement
    .split(/\n\s*\n/)
    .map((para) => `<p>${inline(para.trim()).replace(/\n/g, '<br>')}</p>`)
    .join('')
  const examples = p.tests
    .filter((t) => t.example)
    .map((t, i) => {
      const args: unknown[] = JSON.parse(t.argsJson)
      const input = p.params.map((x, j) => `${x.name} = ${json(args[j])}`).join(', ')
      return (
        `<p><strong class="example">Example ${i + 1}:</strong></p><pre>` +
        `<strong>Input:</strong> ${esc(input)}\n` +
        `<strong>Output:</strong> ${esc(json(JSON.parse(t.expectedJson)))}` +
        (t.explanation.trim() ? `\n<strong>Explanation:</strong> ${esc(t.explanation.replace(/`|\*\*/g, ''))}` : '') +
        `</pre>`
      )
    })
    .join('')
  const constraints = p.constraints.length
    ? `<p><strong>Constraints:</strong></p><ul>${p.constraints.map((c) => `<li><code>${esc(c.replace(/`/g, ''))}</code></li>`).join('')}</ul>`
    : ''
  const follow = p.followUp.trim() ? `<p><strong>Follow-up:</strong> ${inline(p.followUp)}</p>` : ''
  return paras + examples + constraints + follow
}

/** Shapes a custom problem like a LeetCode problem so the workspace components can render it. */
export function toDetail(p: CustomProblem): ProblemDetail {
  return {
    questionId: p.id,
    id: '',
    title: p.title,
    slug: p.id,
    content: contentHtml(p),
    difficulty: p.difficulty,
    likes: 0,
    dislikes: 0,
    paidOnly: false,
    status: p.status,
    tags: p.tags.map((t) => ({ name: t, slug: t.toLowerCase().replace(/\s+/g, '-') })),
    snippets: [{ lang: 'TypeScript', langSlug: 'typescript', code: starterCode(p) }],
    exampleTestcases: '',
    params: p.params,
    similar: [],
    hints: p.hints.map(inline),
    acRate: '',
    totalAccepted: '',
    totalSubmission: ''
  }
}

/** The examples as editable console test cases: one JSON value per parameter. */
export const exampleCases = (p: GeneratedProblem): ConsoleCase[] =>
  p.tests.filter((t) => t.example).map((t) => ({ values: (JSON.parse(t.argsJson) as unknown[]).map((v) => json(v)) }))

// ── Judging ──

const base = (kind: 'run' | 'submit'): RunResult => ({ kind, state: 'SUCCESS', statusCode: 10, statusMsg: 'Accepted', runSuccess: true })

/** Errors that stop a run before any test result: compile errors and timeouts. */
function fatal(kind: 'run' | 'submit', r: LocalRun): RunResult | null {
  if (r.compile) return { ...base(kind), statusCode: 20, statusMsg: 'Compile Error', runSuccess: false, compileError: r.error }
  if (r.timedOut) return { ...base(kind), statusCode: 14, statusMsg: 'Time Limit Exceeded', runSuccess: false, runtimeError: r.error }
  if (r.error) return { ...base(kind), statusCode: 15, statusMsg: 'Runtime Error', runSuccess: false, runtimeError: r.error }
  return null
}

/** Run: your code on the console's cases, compared with the reference solution's output. */
export async function judgeRun(p: CustomProblem, code: string, cases: ConsoleCase[]): Promise<RunResult> {
  let argsList: unknown[][]
  try {
    argsList = cases.map((c) => c.values.map((v) => JSON.parse(v)))
  } catch (e) {
    return { ...base('run'), statusCode: 15, statusMsg: 'Invalid Testcase', runSuccess: false, runtimeError: `Each value must be valid JSON. ${(e as Error).message}` }
  }
  const ref = await runTests(p.solution, p.fn, argsList.map((args) => ({ args, expected: null })))
  const tests = argsList.map((args, i) => ({ args, expected: ref.tests[i]?.got }))
  const r = await runTests(code, p.fn, tests, p.unordered)
  const f = fatal('run', r)
  if (f) return f
  const crashed = r.tests.findIndex((t) => t.error)
  if (crashed >= 0)
    return {
      ...base('run'),
      statusCode: 15,
      statusMsg: 'Runtime Error',
      runSuccess: false,
      runtimeError: r.tests[crashed].error,
      lastTestcase: cases[crashed].values.join('\n')
    }
  return {
    ...base('run'),
    runtime: `${r.ms} ms`,
    codeAnswer: r.tests.map((t) => json(t.got) ?? 'undefined'),
    expectedAnswer: r.tests.map((t, i) => ref.tests[i]?.error ?? json(t.expected) ?? 'undefined'),
    compareResult: r.tests.map((t) => (t.pass ? '1' : '0')).join(''),
    stdout: r.tests.map((t) => t.logs.join('\n'))
  }
}

/** Submit: your code against every test, examples and hidden ones. */
export async function judgeSubmit(p: CustomProblem, code: string): Promise<RunResult> {
  const tests = parseTests(p)
  const r = await runTests(code, p.fn, tests, p.unordered)
  const f = fatal('submit', r)
  if (f) return f
  const total = r.tests.length
  const passed = r.tests.filter((t) => t.pass).length
  const failed = r.tests.find((t) => !t.pass)
  if (!failed) return { ...base('submit'), totalCorrect: passed, totalTestcases: total, runtime: `${r.ms} ms` }
  const last = failed.args.map((a) => json(a)).join('\n')
  if (failed.error)
    return {
      ...base('submit'),
      statusCode: 15,
      statusMsg: 'Runtime Error',
      runSuccess: false,
      runtimeError: failed.error,
      lastTestcase: last,
      totalCorrect: passed,
      totalTestcases: total
    }
  return {
    ...base('submit'),
    statusCode: 11,
    statusMsg: 'Wrong Answer',
    totalCorrect: passed,
    totalTestcases: total,
    lastTestcase: last,
    codeOutput: json(failed.got) ?? 'undefined',
    expectedOutput: json(failed.expected),
    stdOutput: failed.logs.join('\n')
  }
}
