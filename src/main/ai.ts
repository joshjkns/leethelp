// Generates practice problems for the trainer with Claude. Output is constrained by a strict JSON
// schema; the renderer then runs the tests before accepting anything (see custom.ts).
//
// Two ways in, tried in order:
//   1. Claude Code: the installed `claude` CLI in print mode, using your existing Claude Code login.
//   2. An Anthropic API key, saved in the app or from ANTHROPIC_API_KEY.
import { app, safeStorage } from 'electron'
import { execFile, spawn } from 'node:child_process'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { access, constants, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { z } from 'zod'
import type { AiStatus, GenerateProblemRequest, GeneratedProblem } from '@shared/types'

const MODEL = 'claude-opus-5-5'
const keyPath = (): string => join(app.getPath('userData'), 'anthropic-key.bin')

// The key never reaches the renderer: it's encrypted with the OS keychain and only read here.
async function savedKey(): Promise<string | null> {
  try {
    return safeStorage.decryptString(await readFile(keyPath()))
  } catch {
    return null
  }
}

export async function status(): Promise<AiStatus> {
  const claudeCode = !!(await findClaude())
  const key = (await savedKey()) ? 'saved' : process.env.ANTHROPIC_API_KEY ? 'env' : null
  return { claudeCode, key, using: claudeCode ? 'claude-code' : key ? 'api' : null }
}

// ── Claude Code ──

interface Shell {
  bin: string
  /** PATH from a login shell: apps opened from Finder get a minimal one. */
  path: string
}
let shell: Promise<Shell | null> | null = null

/** Finds the `claude` CLI the way your terminal would, falling back to common install locations. */
function findClaude(): Promise<Shell | null> {
  return (shell ??= (async () => {
    const sh = process.env.SHELL || '/bin/zsh'
    const fromShell = await new Promise<{ bin: string; path: string } | null>((resolve) =>
      execFile(sh, ['-lc', 'printf "%s\\n%s" "$(command -v claude)" "$PATH"'], { timeout: 5000 }, (err, out) => {
        if (err) return resolve(null)
        const [bin, path] = out.trim().split('\n')
        resolve({ bin: bin?.trim() ?? '', path: path?.trim() ?? '' })
      })
    )
    const path = fromShell?.path || process.env.PATH || ''
    const home = homedir()
    const candidates = [
      fromShell?.bin,
      join(home, '.claude/local/claude'),
      join(home, '.local/bin/claude'),
      '/opt/homebrew/bin/claude',
      '/usr/local/bin/claude',
      join(home, '.npm-global/bin/claude')
    ]
    for (const c of candidates) {
      if (!c) continue
      try {
        await access(c, constants.X_OK)
        return { bin: c, path: [path, '/opt/homebrew/bin', '/usr/local/bin'].filter(Boolean).join(':') }
      } catch {
        // try the next location
      }
    }
    return null
  })())
}

const CLAUDE_CODE_TIMEOUT = 5 * 60_000

/** The strict schema for the CLI. Its validator rejects zod's draft-2020-12 `$schema` marker, so drop it. */
function problemSchemaJson(): string {
  const { $schema: _, ...schema } = z.toJSONSchema(Problem)
  return JSON.stringify(schema)
}

async function generateWithClaudeCode(cli: Shell, req: GenerateProblemRequest): Promise<GeneratedProblem> {
  // An empty working directory, so no project's CLAUDE.md or settings get pulled in.
  const cwd = join(app.getPath('userData'), 'claude-code')
  await mkdir(cwd, { recursive: true })
  const args = [
    '-p',
    '--output-format', 'json',
    '--json-schema', problemSchemaJson(),
    '--system-prompt', SYSTEM,
    '--model', 'opus',
    '--effort', 'high',
    // A pure text task: no tools, MCP servers, user hooks or saved session.
    '--tools', '',
    '--strict-mcp-config',
    '--setting-sources', 'project',
    '--no-session-persistence'
  ]
  const stdout = await new Promise<string>((resolve, reject) => {
    // The full environment is passed through: the keychain login needs USER/LOGNAME.
    const child = spawn(cli.bin, args, { cwd, env: { ...process.env, PATH: cli.path } })
    let out = ''
    let err = ''
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error('Claude Code took too long to respond. Try again.'))
    }, CLAUDE_CODE_TIMEOUT)
    child.stdout.on('data', (d) => (out += d))
    child.stderr.on('data', (d) => (err += d))
    child.on('error', (e) => {
      clearTimeout(timer)
      reject(new Error(`Couldn’t start Claude Code: ${e.message}`))
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (out.trim()) resolve(out)
      else reject(new Error(`Claude Code exited with code ${code}${err.trim() ? `: ${err.trim().slice(0, 300)}` : ''}`))
    })
    child.stdin.end(userMessage(req))
  })

  let res: { is_error?: boolean; result?: string; structured_output?: unknown }
  try {
    res = JSON.parse(stdout)
  } catch {
    throw new Error('Claude Code returned something that isn’t JSON. Is it up to date?')
  }
  if (res.is_error) {
    const msg = res.result ?? 'unknown error'
    if (/not logged in|\/login/i.test(msg)) throw new Error('Claude Code isn’t signed in. Run `claude` in a terminal and log in, then try again.')
    throw new Error(`Claude Code: ${msg}`)
  }
  const parsed = Problem.safeParse(res.structured_output)
  if (!parsed.success) throw new Error('Claude Code’s response didn’t match the problem schema. Try again.')
  return parsed.data
}

export async function setKey(key: string | null): Promise<AiStatus> {
  const k = key?.trim()
  if (!k) await rm(keyPath(), { force: true })
  else {
    if (!safeStorage.isEncryptionAvailable()) throw new Error('Secure storage is unavailable, so the key can’t be saved.')
    await writeFile(keyPath(), safeStorage.encryptString(k))
  }
  return status()
}

export const Problem = z.object({
  title: z.string().describe('Short original title in Title Case, e.g. "Longest Calm Stretch".'),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']),
  tags: z.array(z.string()).describe('1 to 3 topic tags, e.g. "Array", "Sliding Window", "Hash Table".'),
  statement: z
    .string()
    .describe(
      'The problem statement, LeetCode style: 1 to 3 short paragraphs separated by blank lines. Wrap identifiers, values and expressions in backticks; **double asterisks** for a defined term. No other markdown. Do not include examples or constraints here.'
    ),
  constraints: z
    .array(z.string())
    .describe('3 to 5 constraints, each a short expression such as "1 <= nums.length <= 10^5" or "s consists of lowercase English letters".'),
  hints: z.array(z.string()).describe('2 or 3 progressive hints, from a gentle nudge to nearly the approach. Backticks for code.'),
  followUp: z.string().describe('An optional follow-up question (e.g. "Can you do it in O(1) extra space?"), or an empty string.'),
  fn: z.string().describe('Name of the function the learner implements, in camelCase.'),
  params: z
    .array(z.object({ name: z.string(), type: z.string().describe('TypeScript type, e.g. "number[]", "string", "number[][]".') }))
    .describe('The function parameters, in order.'),
  returnType: z.string().describe('TypeScript return type, e.g. "number", "boolean", "string[]".'),
  solution: z.string().describe('A complete, correct, efficient reference solution in TypeScript: one top-level function named `fn`.'),
  unordered: z.boolean().describe('True only if the returned array may be in any order (nested arrays included).'),
  tests: z
    .array(
      z.object({
        argsJson: z.string().describe('JSON array of the arguments, in parameter order, e.g. "[[2,7,11,15], 9]".'),
        expectedJson: z.string().describe('JSON of the expected return value, e.g. "[0,1]".'),
        example: z.boolean().describe('True for the 2 or 3 tests shown as examples in the statement; they must come first.'),
        explanation: z.string().describe('For examples, a one or two sentence walkthrough of why the output is right. Empty string otherwise.')
      })
    )
    .describe('10 to 15 tests: 2 or 3 examples first, then hidden tests covering edge cases and a few larger inputs.')
})

export const SYSTEM = `You write original LeetCode-style coding problems for a TypeScript interview-practice app. The learner sees the statement, examples and constraints, writes the function from an empty signature, and is judged by running your tests against their code, exactly like LeetCode.

The problem:
- A self-contained algorithmic task at the requested difficulty, on the requested topic. Original wording and an original scenario; never copy or lightly reword a statement from LeetCode or another site, even when the underlying pattern is a classic one.
- Precise: input format, output format and tie-breaking rules must leave exactly one correct answer per input, unless \`unordered\` is true and only the order varies. If several answers could be valid, add a rule that picks one.
- Parameters and the return value are plain JSON values (numbers, strings, booleans, null, arrays, plain objects). No linked lists, trees as node objects, Map, Set, undefined, NaN or Infinity at the boundary. Represent graphs and trees as arrays (edge lists, level-order arrays) if needed.
- Constraints sized so an efficient solution matters, but keep every test input small enough to embed (at most a few hundred elements).

The reference solution (\`solution\`):
- One top-level \`function\` named \`fn\` whose parameters match \`params\` (names and order) and whose return type is \`returnType\`. Helpers may be nested inside it. No imports, classes or I/O.
- Idiomatic TypeScript with type annotations and 2-space indentation, using the optimal approach for the topic.

The tests:
- 10 to 15 cases. The first 2 or 3 have \`example: true\` and an explanation; the rest are hidden and cover edge cases (minimum sizes, duplicates, negatives, all-equal, already sorted, no valid answer) and a couple of larger inputs.
- \`argsJson\` is a JSON array with one entry per parameter; \`expectedJson\` is the JSON return value. Both must parse with JSON.parse.
- Trace the reference solution to compute every expected value. Wrong expected values are the most common failure, so double-check each one.`

function userMessage(req: GenerateProblemRequest): string {
  const ask = `Write one ${req.difficulty} problem about: ${req.topic.trim() || 'any classic interview pattern'}.`
  if (!req.retry) return ask
  return `${ask}

Your previous attempt failed verification:
${req.retry.errors.map((e) => `- ${e}`).join('\n')}

Previous attempt:
${JSON.stringify(req.retry.previous, null, 2)}

Fix the problems. Keep the same idea if it is sound, and recompute every expected value.`
}

export async function generate(req: GenerateProblemRequest): Promise<GeneratedProblem> {
  const cli = await findClaude()
  if (cli) return generateWithClaudeCode(cli, req)
  return generateWithApi(req)
}

// ── Anthropic API ──

async function generateWithApi(req: GenerateProblemRequest): Promise<GeneratedProblem> {
  const apiKey = await savedKey()
  // Without a saved key, fall back to the SDK's own resolution (ANTHROPIC_API_KEY, `ant` profiles).
  const client = apiKey ? new Anthropic({ apiKey }) : new Anthropic()
  try {
    const res = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      // If a safety classifier declines, the server retries on a fallback model in the same call.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'high', format: betaZodOutputFormat(Problem) },
      system: SYSTEM,
      messages: [{ role: 'user', content: userMessage(req) }]
    })
    if (res.stop_reason === 'refusal') throw new Error('The model declined this topic. Try wording it differently.')
    if (res.stop_reason === 'max_tokens') throw new Error('The response was cut off. Try a narrower topic.')
    if (!res.parsed_output) throw new Error('The response didn’t match the problem schema. Try again.')
    return res.parsed_output
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) throw new Error('Your Anthropic API key was rejected. Remove it below and paste a valid one.')
    if (e instanceof Anthropic.PermissionDeniedError) throw new Error('This API key doesn’t have access to the model.')
    if (e instanceof Anthropic.RateLimitError) throw new Error('Rate limited by the API. Wait a moment and try again.')
    if (e instanceof Anthropic.APIConnectionError) throw new Error('Couldn’t reach the Anthropic API. Check your connection.')
    if (e instanceof Anthropic.APIError) throw new Error(`API error ${e.status ?? ''}: ${e.message}`.trim())
    // With no key anywhere, any other failure is almost certainly missing credentials.
    if (!apiKey && !process.env.ANTHROPIC_API_KEY)
      throw new Error('Install Claude Code and sign in, or add an Anthropic API key, to generate problems.')
    throw e
  }
}
