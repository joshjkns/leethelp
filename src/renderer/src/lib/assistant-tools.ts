// What the assistant's tools actually do, against the live app. Results go back to the model as text
// (JSON for data); cards shown in the chat are pushed with ctx.push.
import type { AssistantToolResult, GeneratedProblem, RunResult } from '@shared/types'
import type { Part } from './assistant'
import { useApp } from './store'
import { activeWorkspace } from './workspace-bridge'
import { finalize, useCustomProblems, verify } from './custom-problems'
import { STUDY_LISTS, listProgress, listSlugs } from './lists'
import { useTrainer, type Focus } from './trainer/store'

interface Ctx {
  /** The chat this tool call belongs to. */
  chatId: string
  push: (p: Part) => void
  ask: (question: string, options: string[]) => Promise<string | null>
}
type Input = Record<string, unknown>

const ok = (v: unknown): AssistantToolResult => ({ text: typeof v === 'string' ? v : JSON.stringify(v) })
const fail = (text: string): AssistantToolResult => ({ text, isError: true })
const str = (v: unknown): string => (typeof v === 'string' ? v : '')

/** Readable text from LeetCode's problem HTML. */
function htmlToText(html: string): string {
  const s = html
    .replace(/<sup>(.*?)<\/sup>/g, '^$1')
    .replace(/<li>/g, '- ')
    .replace(/<\/(p|li|pre|div|ul|ol|h\d)>|<br\s*\/?>/g, '\n')
    .replace(/<[^>]+>/g, '')
  const el = document.createElement('textarea')
  el.innerHTML = s
  return el.value.replace(/\n{3,}/g, '\n\n').trim()
}

function summarize(r: RunResult): { text: string; title: string; good: boolean; detail?: string } {
  const good = r.kind === 'submit' ? r.statusCode === 10 : r.statusCode === 10 && !!r.compareResult && !r.compareResult.includes('0')
  const title = r.kind === 'run' && r.statusCode === 10 ? (good ? 'All cases passed' : 'Wrong Answer') : r.statusMsg
  const err = r.compileError || r.runtimeError
  const lines = [title]
  if (r.totalTestcases != null) lines.push(`${r.totalCorrect}/${r.totalTestcases} tests passed`)
  if (err) lines.push(err)
  if (r.lastTestcase) lines.push(`Input: ${r.lastTestcase.replace(/\n/g, ', ')}`)
  if (r.codeOutput) lines.push(`Output: ${r.codeOutput}`, `Expected: ${r.expectedOutput ?? ''}`)
  if (r.kind === 'run' && r.codeAnswer) {
    r.codeAnswer.forEach((out, i) =>
      lines.push(`Case ${i + 1}: ${r.compareResult?.[i] === '1' ? 'pass' : 'FAIL'}, output ${out}, expected ${r.expectedAnswer?.[i] ?? '?'}`)
    )
    r.stdout?.forEach((o, i) => o && lines.push(`Case ${i + 1} stdout: ${o}`))
  }
  if (r.runtime) lines.push(`Runtime: ${r.runtime}`)
  const detail = r.totalTestcases != null ? `${r.totalCorrect}/${r.totalTestcases} tests` : err ? err.split('\n')[0].slice(0, 120) : r.runtime
  return { text: lines.join('\n'), title, good, detail }
}

/** A one-line label for the chat's activity steps; null hides the step. */
export function stepLabel(name: string, i: Input): string | null {
  switch (name) {
    case 'get_app_state':
      return 'Looking at the app'
    case 'search_problems':
      return i.query ? `Searching problems for “${str(i.query)}”` : `Searching problems${i.tag ? ` tagged ${str(i.tag)}` : ''}`
    case 'get_problem':
      return `Reading ${useApp.getState().bySlug.get(str(i.slug))?.title ?? str(i.slug)}`
    case 'open_problem':
      return `Opening ${useApp.getState().bySlug.get(str(i.slug))?.title ?? str(i.slug)}`
    case 'navigate':
      return `Going to ${str(i.view)}`
    case 'get_code':
      return 'Reading your code'
    case 'set_code':
      return 'Writing to the editor'
    case 'run_code':
      return i.cases ? 'Running on new test cases' : 'Running your code'
    case 'submit_code':
      return 'Submitting against all tests'
    case 'create_problem':
      return `Writing and verifying “${str(i.title)}”`
    case 'list_generated_problems':
      return 'Checking your generated problems'
    case 'open_generated_problem':
      return 'Opening a generated problem'
    case 'get_progress':
      return 'Checking your progress'
    case 'get_study_lists':
    case 'get_study_list':
      return 'Checking study lists'
    case 'start_drill':
      return 'Opening the trainer'
    default:
      return null
  }
}

export async function runTool(name: string, i: Input, ctx: Ctx): Promise<AssistantToolResult> {
  const app = useApp.getState()
  switch (name) {
    case 'get_app_state': {
      const ws = activeWorkspace()
      const last = ws?.lastResult()
      return ok({
        page: app.view,
        openProblem: ws ? { kind: ws.kind, id: ws.id, title: ws.title, language: ws.lang } : null,
        lastResult: last ? summarize(last).text : null,
        signedIn: app.user.signedIn,
        username: app.user.username,
        problemSetLoaded: !!app.list
      })
    }

    case 'search_problems': {
      if (!app.list) return fail('The problem set is still loading.')
      const q = str(i.query).trim().toLowerCase()
      const tag = str(i.tag).trim().toLowerCase().replace(/\s+/g, '-')
      const status = { solved: 'ac', attempted: 'notac', todo: null }[str(i.status) as 'solved'] as string | null | undefined
      const limit = typeof i.limit === 'number' ? i.limit : 15
      let rows = app.list.problems.filter(
        (p) =>
          (!q || p.id === q || p.title.toLowerCase().includes(q) || p.slug.includes(q.replace(/\s+/g, '-'))) &&
          (!i.difficulty || p.difficulty === i.difficulty) &&
          (!tag || p.tags.some((t) => t === tag || t.includes(tag) || app.list!.tags[t]?.toLowerCase() === tag.replace(/-/g, ' '))) &&
          (i.status === undefined || p.status === status)
      )
      if (q) rows = [...rows.filter((p) => p.id === q), ...rows.filter((p) => p.id !== q)]
      return ok({
        total: rows.length,
        problems: rows.slice(0, limit).map((p) => ({
          id: p.id,
          title: p.title,
          slug: p.slug,
          difficulty: p.difficulty,
          acceptance: `${p.acRate.toFixed(0)}%`,
          tags: p.tags.map((t) => app.list!.tags[t] ?? t),
          status: p.status === 'ac' ? 'solved' : p.status === 'notac' ? 'attempted' : 'todo',
          ...(p.paidOnly ? { premium: true } : {})
        }))
      })
    }

    case 'get_problem': {
      const d = await window.api.getProblem(str(i.slug))
      return ok({
        id: d.id,
        title: d.title,
        slug: d.slug,
        difficulty: d.difficulty,
        status: d.status === 'ac' ? 'solved' : d.status === 'notac' ? 'attempted' : 'todo',
        tags: d.tags.map((t) => t.name),
        statement: d.content ? htmlToText(d.content) : '(Premium problem; the statement is hidden.)',
        hints: d.hints.map(htmlToText),
        params: d.params,
        typescriptStarter: d.snippets.find((s) => s.langSlug === 'typescript')?.code ?? null,
        similar: d.similar.map((s) => `${s.title} (${s.slug}, ${s.difficulty})`)
      })
    }

    case 'open_problem': {
      const slug = str(i.slug)
      const p = app.bySlug.get(slug)
      if (!p) return fail(`No problem with slug "${slug}". Use search_problems to find it.`)
      app.openProblem(slug)
      ctx.push({ kind: 'problem', source: 'leetcode', id: slug, title: `${p.id}. ${p.title}`, difficulty: p.difficulty })
      return ok(`Opened ${p.title} in the workspace.`)
    }

    case 'navigate': {
      app.setView(str(i.view) as never)
      return ok(`Now showing ${str(i.view)}.`)
    }

    case 'get_code': {
      const ws = activeWorkspace()
      if (!ws) return fail('No problem is open in the workspace.')
      const names = ws.params.map((p) => p.name)
      return ok({
        problem: ws.title,
        kind: ws.kind,
        language: ws.lang,
        code: ws.getCode(),
        consoleCases: ws.getCases().map((c) => c.values.map((v, j) => `${names[j] ?? `arg${j + 1}`} = ${v}`).join(', '))
      })
    }

    case 'set_code': {
      const ws = activeWorkspace()
      if (!ws) return fail('No problem is open in the workspace.')
      ws.setCode(str(i.code))
      return ok('The editor now has your code. The user can undo with ⌘Z.')
    }

    case 'run_code': {
      const ws = activeWorkspace()
      if (!ws) return fail('No problem is open in the workspace.')
      if (Array.isArray(i.cases)) {
        const cases = (i.cases as unknown[]).map((c) => ({ values: (c as unknown[]).map((v) => (typeof v === 'string' ? v : JSON.stringify(v))) }))
        const bad = cases.findIndex((c) => c.values.length !== ws.params.length)
        if (bad >= 0) return fail(`Case ${bad + 1} has ${cases[bad].values.length} values but the function takes ${ws.params.length}.`)
        ws.setCases(cases)
      }
      if (ws.kind === 'leetcode' && !app.user.signedIn) return fail('The user isn’t signed in to LeetCode, so LeetCode problems can’t be run.')
      const r = await ws.run()
      if (!r) return fail('Couldn’t run: a run is already in progress.')
      const s = summarize(r)
      ctx.push({ kind: 'result', title: s.title, good: s.good, detail: s.detail })
      return ok(s.text)
    }

    case 'submit_code': {
      const ws = activeWorkspace()
      if (!ws) return fail('No problem is open in the workspace.')
      if (!ws.submit) return fail('Only generated problems can be submitted by the assistant. The user submits LeetCode problems themselves.')
      const r = await ws.submit()
      if (!r) return fail('Couldn’t submit: a run is already in progress.')
      const s = summarize(r)
      ctx.push({ kind: 'result', title: s.title, good: s.good, detail: s.detail })
      return ok(s.text)
    }

    case 'create_problem': {
      const r = await verify(i as unknown as GeneratedProblem)
      if ('errors' in r) return fail(`Verification failed; fix these and call create_problem again:\n${r.errors.map((e) => `- ${e}`).join('\n')}`)
      const p = { ...finalize(r.problem, 'assistant'), chatId: ctx.chatId }
      useCustomProblems.getState().add(p)
      app.openCustom(p.id)
      ctx.push({ kind: 'problem', source: 'custom', id: p.id, title: p.title, difficulty: p.difficulty })
      return ok(
        `Created "${p.title}" (id ${p.id}); all ${p.tests.length} tests pass against the reference solution. It's open in the workspace with an empty function. Don't reveal the solution unless asked.`
      )
    }

    case 'list_generated_problems':
      return ok(
        useCustomProblems.getState().problems.map((p) => ({
          id: p.id,
          title: p.title,
          difficulty: p.difficulty,
          tags: p.tags,
          status: p.status === 'ac' ? 'solved' : p.status === 'notac' ? 'attempted' : 'todo'
        }))
      )

    case 'open_generated_problem': {
      const p = useCustomProblems.getState().problems.find((x) => x.id === str(i.id))
      if (!p) return fail(`No generated problem with id "${str(i.id)}".`)
      app.openCustom(p.id)
      ctx.push({ kind: 'problem', source: 'custom', id: p.id, title: p.title, difficulty: p.difficulty })
      return ok(`Opened ${p.title}.`)
    }

    case 'get_progress': {
      const solvedLocal = { Easy: 0, Medium: 0, Hard: 0 }
      for (const p of app.list?.problems ?? []) if (p.status === 'ac') solvedLocal[p.difficulty]++
      const pr = app.profile
      if (!pr) return ok({ signedIn: false, solved: solvedLocal })
      const tags = [...pr.tagProgress].sort((a, b) => b.problemsSolved - a.problemsSolved)
      return ok({
        username: pr.username,
        solved: Object.fromEntries(pr.solved.map((d) => [d.difficulty, d.count])),
        totals: Object.fromEntries(pr.totals.map((d) => [d.difficulty, d.count])),
        beats: pr.beats.map((b) => `${b.difficulty}: ${b.percentage?.toFixed(1) ?? '?'}%`),
        streak: pr.streak,
        activeDays: pr.totalActiveDays,
        strongestTopics: tags.slice(0, 6).map((t) => `${t.tagName} (${t.problemsSolved})`),
        weakestTopics: tags.slice(-6).map((t) => `${t.tagName} (${t.problemsSolved})`),
        recentAccepted: pr.recent.slice(0, 10).map((r) => r.title),
        generatedProblemsSolved: useCustomProblems.getState().problems.filter((p) => p.status === 'ac').length
      })
    }

    case 'get_study_lists':
      return ok(
        STUDY_LISTS.map((l) => {
          const pr = listProgress(listSlugs(l), app.bySlug)
          return { id: l.id, name: l.name, description: l.description, solved: pr.solved, total: pr.total }
        })
      )

    case 'get_study_list': {
      const l = STUDY_LISTS.find((x) => x.id === str(i.id))
      if (!l) return fail(`No list "${str(i.id)}". Ids: ${STUDY_LISTS.map((x) => x.id).join(', ')}`)
      return ok({
        name: l.name,
        sections: l.sections.map((sec) => ({
          name: sec.name,
          problems: sec.slugs.map((slug) => {
            const p = app.bySlug.get(slug)
            return `${p?.title ?? slug} (${slug}, ${p?.difficulty ?? '?'}, ${p?.status === 'ac' ? 'solved' : 'todo'})`
          })
        }))
      })
    }

    case 'start_drill': {
      useTrainer.getState().setFocus(str(i.focus) as Focus)
      app.setView('learn')
      return ok('The trainer is open.')
    }

    case 'ask_user': {
      const answer = await ctx.ask(str(i.question), (i.options as string[]) ?? [])
      return answer == null ? fail('The user didn’t answer.') : ok(`The user answered: ${answer}`)
    }

    default:
      return fail(`Unknown tool ${name}`)
  }
}
