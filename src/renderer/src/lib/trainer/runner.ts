// Runs trainer code: TypeScript is transpiled in-process (the compiler is loaded on first use) and
// executed in a throwaway Web Worker, which is terminated on timeout so infinite loops can't hang
// the app. The code is baked into the worker's blob rather than eval'd, which the CSP forbids.
import type { TestCase } from './types'

type TS = typeof import('typescript')
let tsPromise: Promise<TS> | null = null
const loadTs = (): Promise<TS> => (tsPromise ??= import('typescript').then((m) => ((m as { default?: TS }).default ?? m) as TS))

/** Starts loading the compiler so the first run doesn't wait on it. */
export const preloadCompiler = (): void => void loadTs()

async function transpile(src: string): Promise<string> {
  const ts = await loadTs()
  const out = ts.transpileModule(src, {
    reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, removeComments: true }
  })
  const err = out.diagnostics?.find((d) => d.category === ts.DiagnosticCategory.Error)
  if (err) throw new SyntaxError(ts.flattenDiagnosticMessageText(err.messageText, '\n'))
  return out.outputText
}

export interface TestResult {
  pass: boolean
  args: unknown[]
  expected: unknown
  got?: unknown
  error?: string
  /** console output while this test ran */
  logs: string[]
}

export interface RunResult {
  /** Compile error, timeout or a crash before any test ran. */
  error?: string
  /** The error came from the compiler, so nothing ran. */
  compile?: boolean
  /** The code was stopped for running too long. */
  timedOut?: boolean
  tests: TestResult[]
  logs: string[]
  ms: number
}

const TIMEOUT = 2500

// Shared by every worker: captures console output and formats values for it.
const PRELUDE = `
const __logs = [];
const __fmt = (v) => {
  try {
    if (typeof v === 'string') return v;
    if (v instanceof Map) return 'Map(' + JSON.stringify([...v]) + ')';
    if (v instanceof Set) return 'Set(' + JSON.stringify([...v]) + ')';
    return JSON.stringify(v) ?? String(v);
  } catch { return String(v); }
};
const __console = { log: (...a) => { if (__logs.length < 200) __logs.push(a.map(__fmt).join(' ')); } };
__console.info = __console.warn = __console.error = __console.debug = __console.log;
const __err = (e) => (e && e.name ? e.name + ': ' + e.message : String(e));
`

function execute(
  body: string
): Promise<{ data?: { tests?: TestResult[]; value?: unknown; error?: string; logs: string[] }; error?: string; timedOut?: boolean }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(new Blob([PRELUDE + body], { type: 'text/javascript' }))
    const worker = new Worker(url)
    const done = (r: Parameters<typeof resolve>[0]): void => {
      clearTimeout(timer)
      worker.terminate()
      URL.revokeObjectURL(url)
      resolve(r)
    }
    const timer = setTimeout(() => done({ error: `Timed out after ${TIMEOUT / 1000}s. Infinite loop?`, timedOut: true }), TIMEOUT)
    worker.onmessage = (e) => done({ data: e.data })
    worker.onerror = (e) => {
      e.preventDefault()
      done({ error: e.message || 'Script error' })
    }
  })
}

/** Runs `fn` from `code` against each test case. */
export async function runTests(code: string, fn: string, tests: TestCase[], unordered = false): Promise<RunResult> {
  const t0 = performance.now()
  let js: string
  try {
    js = await transpile(code)
  } catch (e) {
    return { error: (e as Error).message, compile: true, tests: [], logs: [], ms: 0 }
  }
  const body = `
let __fn;
try {
  __fn = (function (exports, console) {
${js}
;return typeof ${fn} === 'function' ? ${fn} : exports[${JSON.stringify(fn)}];
  })({}, __console);
} catch (e) { postMessage({ error: __err(e), logs: __logs }); throw e; }
if (typeof __fn !== 'function') {
  postMessage({ error: ${JSON.stringify(`Couldn't find a top-level function named ${fn}. Keep the given signature.`)}, logs: __logs });
} else {
  const tests = ${JSON.stringify(tests)};
  const out = tests.map((t) => {
    const start = __logs.length;
    try { return { got: __fn(...structuredClone(t.args)), logs: __logs.slice(start) }; }
    catch (e) { return { error: __err(e), logs: __logs.slice(start) }; }
  });
  postMessage({ tests: out, logs: __logs });
}`
  const r = await execute(body)
  const ms = Math.round(performance.now() - t0)
  if (r.error || r.data?.error) return { error: r.error ?? r.data?.error, timedOut: r.timedOut, tests: [], logs: r.data?.logs ?? [], ms }
  const raw = r.data!.tests!
  return {
    tests: tests.map((t, i) => {
      const { got, error, logs } = raw[i]
      return { args: t.args, expected: t.expected, got, error, logs: logs ?? [], pass: !error && equal(got, t.expected, unordered) }
    }),
    logs: r.data!.logs,
    ms
  }
}

/** Evaluates an expression typed into a card after optional setup code. */
export async function evaluate(expr: string, setup = ''): Promise<{ value?: unknown; error?: string }> {
  let js: string
  try {
    // Transpile setup and expression together so types in either are stripped consistently.
    js = await transpile(`${setup}\n;const __value = (\n${expr}\n);`)
  } catch (e) {
    return { error: (e as Error).message }
  }
  const body = `
try {
  const v = (function (exports, console) {
${js}
;return __value;
  })({}, __console);
  postMessage({ value: v, logs: __logs });
} catch (e) { postMessage({ error: __err(e), logs: __logs }); }`
  const r = await execute(body)
  if (r.error || r.data?.error) return { error: r.error ?? r.data?.error }
  return { value: r.data!.value }
}

/** Puts nested arrays in a canonical order so answers in any order compare equal. */
function canon(v: unknown): unknown {
  if (!Array.isArray(v)) return v
  return v.map(canon).sort((a, b) => {
    const x = JSON.stringify(a)
    const y = JSON.stringify(b)
    return x < y ? -1 : x > y ? 1 : 0
  })
}

export function equal(a: unknown, b: unknown, unordered = false): boolean {
  if (unordered) return equal(canon(a), canon(b))
  // === so 0 and -0 match; NaN is the one value that isn't equal to itself.
  if (a === b || (Number.isNaN(a) && Number.isNaN(b))) return true
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') return false
  if (a instanceof Map || b instanceof Map) {
    if (!(a instanceof Map && b instanceof Map) || a.size !== b.size) return false
    for (const [k, v] of a) if (!b.has(k) || !equal(v, b.get(k))) return false
    return true
  }
  if (a instanceof Set || b instanceof Set) {
    if (!(a instanceof Set && b instanceof Set) || a.size !== b.size) return false
    for (const v of a) if (!b.has(v)) return false
    return true
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false
  const ka = Object.keys(a as object)
  const kb = Object.keys(b as object)
  if (ka.length !== kb.length) return false
  return ka.every((k) => equal((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]))
}

/** Compact display of a value, in roughly the notation you'd type. */
export function show(v: unknown): string {
  if (v === undefined) return 'undefined'
  if (typeof v === 'string') return JSON.stringify(v)
  if (typeof v === 'number' && !Number.isFinite(v)) return String(v)
  if (v instanceof Map) return `Map(${show([...v])})`
  if (v instanceof Set) return `Set(${show([...v])})`
  if (Array.isArray(v)) return `[${v.map(show).join(', ')}]`
  if (v && typeof v === 'object') return `{ ${Object.entries(v).map(([k, x]) => `${k}: ${show(x)}`).join(', ')} }`
  return String(v)
}

/** Loose text normalisation for typed answers: whitespace, quote style and trailing semicolons don't matter. */
export const normalize = (s: string): string =>
  s
    .trim()
    .replace(/;+\s*$/, '')
    .replace(/["`]/g, "'")
    .replace(/\s+/g, '')
