import { session, BrowserWindow, type Session } from 'electron'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { app } from 'electron'
import type {
  DailyChallenge,
  Difficulty,
  ProblemDetail,
  ProblemList,
  ProblemSummary,
  Profile,
  RunResult,
  SimilarQuestion,
  UserStatus
} from '@shared/types'

const BASE = 'https://leetcode.com'
const PARTITION = 'persist:leetcode'
export const CHROME_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'

const ses = (): Session => session.fromPartition(PARTITION)
const cacheDir = (): string => join(app.getPath('userData'), 'cache')

// ───────────────────────── disk cache ─────────────────────────

async function readJson<T>(name: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(join(cacheDir(), name), 'utf8')) as T
  } catch {
    return null
  }
}

async function writeJson(name: string, data: unknown): Promise<void> {
  await mkdir(join(cacheDir(), 'q'), { recursive: true })
  await writeFile(join(cacheDir(), name), JSON.stringify(data))
}

// ───────────────────────── http ─────────────────────────

async function cookieHeader(): Promise<{ cookie: string; csrf: string | null }> {
  const cookies = await ses().cookies.get({ url: BASE })
  const csrf = cookies.find((c) => c.name === 'csrftoken')?.value ?? null
  return { cookie: cookies.map((c) => `${c.name}=${c.value}`).join('; '), csrf }
}

async function http(
  path: string,
  init: { method?: string; body?: unknown; referer?: string } = {}
): Promise<unknown> {
  const { cookie, csrf } = await cookieHeader()
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'user-agent': CHROME_UA,
    origin: BASE,
    referer: init.referer ?? `${BASE}/problemset/`
  }
  if (cookie) headers.cookie = cookie
  if (csrf) headers['x-csrftoken'] = csrf

  let lastErr: unknown
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(BASE + path, {
        method: init.method ?? 'GET',
        headers,
        body: init.body === undefined ? undefined : JSON.stringify(init.body)
      })
      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)))
        continue
      }
      const text = await res.text()
      if (!res.ok) {
        if (res.status === 403 || res.status === 401) throw new Error('Not signed in to LeetCode (or session expired).')
        throw new Error(`LeetCode responded ${res.status}`)
      }
      return JSON.parse(text)
    } catch (e) {
      lastErr = e
      if (e instanceof Error && e.message.startsWith('Not signed in')) throw e
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr))
}

async function gql<T>(query: string, variables: Record<string, unknown> = {}, referer?: string): Promise<T> {
  const res = (await http('/graphql', { method: 'POST', body: { query, variables }, referer })) as {
    data?: T
    errors?: { message: string }[]
  }
  if (!res.data) throw new Error(res.errors?.[0]?.message ?? 'GraphQL error')
  return res.data
}

// ───────────────────────── auth ─────────────────────────

export async function getUser(): Promise<UserStatus> {
  const d = await gql<{ userStatus: { isSignedIn: boolean; username: string; avatar: string; isPremium: boolean } }>(
    `query { userStatus { isSignedIn username avatar isPremium } }`
  )
  const u = d.userStatus
  return {
    signedIn: u.isSignedIn,
    username: u.isSignedIn ? u.username : null,
    avatar: u.isSignedIn ? u.avatar : null,
    premium: !!u.isPremium
  }
}

export function login(parent: BrowserWindow): Promise<UserStatus> {
  return new Promise((resolve) => {
    const win = new BrowserWindow({
      parent,
      modal: true,
      width: 520,
      height: 720,
      title: 'Sign in to LeetCode',
      backgroundColor: '#1a1a1a',
      webPreferences: { partition: PARTITION }
    })
    win.webContents.setUserAgent(CHROME_UA)
    win.loadURL(`${BASE}/accounts/login/`)

    let done = false
    const finish = async (): Promise<void> => {
      if (done) return
      done = true
      ses().cookies.removeListener('changed', onCookie)
      if (!win.isDestroyed()) win.close()
      resolve(await getUser().catch(() => ({ signedIn: false, username: null, avatar: null, premium: false })))
    }
    const onCookie = (_e: unknown, cookie: Electron.Cookie, _cause: string, removed: boolean): void => {
      if (!removed && cookie.name === 'LEETCODE_SESSION' && cookie.value) setTimeout(finish, 600)
    }
    ses().cookies.on('changed', onCookie)
    win.on('closed', finish)
  })
}

export async function logout(): Promise<void> {
  await ses().clearStorageData()
}

export async function setCookies(sessionToken: string, csrf: string): Promise<UserStatus> {
  const expirationDate = Date.now() / 1000 + 60 * 60 * 24 * 14
  const base = { url: BASE, domain: '.leetcode.com', path: '/', secure: true, expirationDate }
  await ses().cookies.set({ ...base, name: 'LEETCODE_SESSION', value: sessionToken.trim(), httpOnly: true })
  await ses().cookies.set({ ...base, name: 'csrftoken', value: csrf.trim() })
  return getUser()
}

// ───────────────────────── problems ─────────────────────────

const LIST_QUERY = `query list($skip: Int, $limit: Int) {
  questionList(categorySlug: "", limit: $limit, skip: $skip, filters: {}) {
    totalNum
    data { questionFrontendId title titleSlug difficulty acRate isPaidOnly status topicTags { name slug } }
  }
}`

interface RawListItem {
  questionFrontendId: string
  title: string
  titleSlug: string
  difficulty: Difficulty
  acRate: number
  isPaidOnly: boolean
  status: 'ac' | 'notac' | null
  topicTags: { name: string; slug: string }[]
}

let refreshing: Promise<ProblemList> | null = null

async function fetchAllProblems(): Promise<ProblemList> {
  type Page = { questionList: { totalNum: number; data: RawListItem[] } }
  const PAGE = 100
  const first = await gql<Page>(LIST_QUERY, { skip: 0, limit: PAGE })
  const total = first.questionList.totalNum
  const pages: RawListItem[][] = [first.questionList.data]
  const offsets: number[] = []
  for (let s = PAGE; s < total; s += PAGE) offsets.push(s)

  const CONCURRENCY = 8
  for (let i = 0; i < offsets.length; i += CONCURRENCY) {
    const chunk = await Promise.all(
      offsets.slice(i, i + CONCURRENCY).map((skip) => gql<Page>(LIST_QUERY, { skip, limit: PAGE }))
    )
    for (const c of chunk) pages.push(c.questionList.data)
  }

  const tags: Record<string, string> = {}
  const problems: ProblemSummary[] = pages.flat().map((q) => {
    for (const t of q.topicTags) tags[t.slug] = t.name
    return {
      id: q.questionFrontendId,
      title: q.title,
      slug: q.titleSlug,
      difficulty: q.difficulty,
      acRate: q.acRate,
      paidOnly: q.isPaidOnly,
      status: q.status,
      tags: q.topicTags.map((t) => t.slug)
    }
  })
  const seen = new Set<string>()
  const unique = problems.filter((p) => (seen.has(p.slug) ? false : (seen.add(p.slug), true)))
  const list = { problems: unique, tags, fetchedAt: Date.now() }
  await writeJson('problems.json', list)
  return list
}

export function refreshProblems(): Promise<ProblemList> {
  if (!refreshing) refreshing = fetchAllProblems().finally(() => (refreshing = null))
  return refreshing
}

const STALE_MS = 1000 * 60 * 30

export async function getProblems(
  force: boolean,
  onBackgroundUpdate: (l: ProblemList) => void
): Promise<ProblemList> {
  const cached = force ? null : await readJson<ProblemList>('problems.json')
  if (cached) {
    if (Date.now() - cached.fetchedAt > STALE_MS) refreshProblems().then(onBackgroundUpdate).catch(() => {})
    return cached
  }
  return refreshProblems()
}

const DETAIL_QUERY = `query q($slug: String!) {
  question(titleSlug: $slug) {
    questionId questionFrontendId title titleSlug content difficulty likes dislikes isPaidOnly status
    topicTags { name slug }
    codeSnippets { lang langSlug code }
    exampleTestcases sampleTestCase metaData similarQuestions hints stats
  }
}`

const detailMem = new Map<string, ProblemDetail>()

function parseParams(meta: string | null): { name: string; type: string }[] {
  if (!meta) return []
  try {
    const m = JSON.parse(meta)
    if (m.systemdesign || m.classname) {
      return [
        { name: 'operations', type: 'string[]' },
        { name: 'arguments', type: 'list' }
      ]
    }
    return Array.isArray(m.params) ? m.params.map((p: { name: string; type: string }) => ({ name: p.name, type: p.type })) : []
  } catch {
    return []
  }
}

export async function getProblem(slug: string, fresh = false): Promise<ProblemDetail> {
  if (!fresh && detailMem.has(slug)) return detailMem.get(slug)!
  const d = await gql<{ question: Record<string, any> | null }>(DETAIL_QUERY, { slug }, `${BASE}/problems/${slug}/`)
  const q = d.question
  if (!q) throw new Error(`Problem "${slug}" not found`)
  let stats: Record<string, string> = {}
  try {
    stats = JSON.parse(q.stats)
  } catch {
    /* ignore */
  }
  let similar: SimilarQuestion[] = []
  try {
    similar = (JSON.parse(q.similarQuestions || '[]') as { title: string; titleSlug: string; difficulty: Difficulty }[]).map(
      (s) => ({ title: s.title, slug: s.titleSlug, difficulty: s.difficulty })
    )
  } catch {
    /* ignore */
  }
  const detail: ProblemDetail = {
    questionId: q.questionId,
    id: q.questionFrontendId,
    title: q.title,
    slug: q.titleSlug,
    content: q.content,
    difficulty: q.difficulty,
    likes: q.likes,
    dislikes: q.dislikes,
    paidOnly: q.isPaidOnly,
    status: q.status,
    tags: q.topicTags ?? [],
    snippets: q.codeSnippets ?? [],
    exampleTestcases: q.exampleTestcases || q.sampleTestCase || '',
    params: parseParams(q.metaData),
    similar,
    hints: q.hints ?? [],
    acRate: stats.acRate ?? '',
    totalAccepted: stats.totalAccepted ?? '',
    totalSubmission: stats.totalSubmission ?? ''
  }
  detailMem.set(slug, detail)
  // Persist the similar-question graph so exploration is instant later.
  similarCache[slug] = similar
  scheduleSimilarSave()
  return detail
}

// Similar-question edges, cached on disk (small: slug -> list).
let similarCache: Record<string, SimilarQuestion[]> = {}
let similarLoaded = false
let saveTimer: NodeJS.Timeout | null = null

function scheduleSimilarSave(): void {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => writeJson('similar.json', similarCache).catch(() => {}), 1500)
}

export async function getSimilar(slug: string): Promise<SimilarQuestion[]> {
  if (!similarLoaded) {
    similarCache = { ...((await readJson<Record<string, SimilarQuestion[]>>('similar.json')) ?? {}), ...similarCache }
    similarLoaded = true
  }
  if (similarCache[slug]) return similarCache[slug]
  const d = await gql<{ question: { similarQuestions: string } | null }>(
    `query q($slug: String!) { question(titleSlug: $slug) { similarQuestions } }`,
    { slug }
  )
  let list: SimilarQuestion[] = []
  try {
    list = (JSON.parse(d.question?.similarQuestions || '[]') as { title: string; titleSlug: string; difficulty: Difficulty }[]).map(
      (s) => ({ title: s.title, slug: s.titleSlug, difficulty: s.difficulty })
    )
  } catch {
    /* ignore */
  }
  similarCache[slug] = list
  scheduleSimilarSave()
  return list
}

// ───────────────────────── profile ─────────────────────────

const PROFILE_QUERY = `query profile($u: String!) {
  allQuestionsCount { difficulty count }
  matchedUser(username: $u) {
    username
    profile { realName userAvatar ranking }
    submitStatsGlobal { acSubmissionNum { difficulty count } }
    problemsSolvedBeatsStats { difficulty percentage }
    userCalendar { streak totalActiveDays submissionCalendar }
    tagProblemCounts {
      advanced { tagName tagSlug problemsSolved }
      intermediate { tagName tagSlug problemsSolved }
      fundamental { tagName tagSlug problemsSolved }
    }
  }
  recentAcSubmissionList(username: $u, limit: 15) { title titleSlug timestamp }
}`

export async function getProfile(username: string): Promise<Profile> {
  const d = await gql<any>(PROFILE_QUERY, { u: username })
  const u = d.matchedUser
  if (!u) throw new Error(`User ${username} not found`)
  let calendar: Record<string, number> = {}
  try {
    calendar = JSON.parse(u.userCalendar?.submissionCalendar || '{}')
  } catch {
    /* ignore */
  }
  const tc = u.tagProblemCounts ?? {}
  return {
    username: u.username,
    avatar: u.profile?.userAvatar ?? null,
    realName: u.profile?.realName ?? null,
    ranking: u.profile?.ranking ?? null,
    solved: u.submitStatsGlobal?.acSubmissionNum ?? [],
    totals: d.allQuestionsCount ?? [],
    beats: u.problemsSolvedBeatsStats ?? [],
    streak: u.userCalendar?.streak ?? 0,
    totalActiveDays: u.userCalendar?.totalActiveDays ?? 0,
    calendar,
    recent: (d.recentAcSubmissionList ?? []).map((r: any) => ({
      title: r.title,
      slug: r.titleSlug,
      timestamp: Number(r.timestamp)
    })),
    tagProgress: [...(tc.fundamental ?? []), ...(tc.intermediate ?? []), ...(tc.advanced ?? [])]
  }
}

export async function getDaily(): Promise<DailyChallenge | null> {
  const d = await gql<any>(
    `query { activeDailyCodingChallengeQuestion { date question { questionFrontendId title titleSlug difficulty } } }`
  )
  const a = d.activeDailyCodingChallengeQuestion
  if (!a) return null
  return {
    date: a.date,
    slug: a.question.titleSlug,
    title: a.question.title,
    difficulty: a.question.difficulty,
    id: a.question.questionFrontendId
  }
}

// ───────────────────────── run / submit ─────────────────────────

async function poll(id: string, slug: string, kind: 'run' | 'submit'): Promise<RunResult> {
  const started = Date.now()
  let delay = 400
  while (Date.now() - started < 60_000) {
    await new Promise((r) => setTimeout(r, delay))
    delay = Math.min(delay * 1.3, 1500)
    const r = (await http(`/submissions/detail/${id}/check/`, { referer: `${BASE}/problems/${slug}/` })) as any
    if (r.state === 'SUCCESS' || r.state === 'FAILURE') return toResult(r, kind)
  }
  throw new Error('Timed out waiting for LeetCode to judge your code.')
}

function toResult(r: any, kind: 'run' | 'submit'): RunResult {
  const pct = (v: unknown): number | null => (typeof v === 'number' ? v : null)
  return {
    kind,
    state: r.state,
    statusCode: r.status_code,
    statusMsg: r.status_msg ?? (r.state === 'FAILURE' ? 'Internal Error' : 'Unknown'),
    runSuccess: !!r.run_success,
    compileError: r.full_compile_error || r.compile_error || undefined,
    runtimeError: r.full_runtime_error || r.runtime_error || undefined,
    codeAnswer: r.code_answer,
    expectedAnswer: r.expected_code_answer,
    stdout: r.std_output_list,
    compareResult: r.compare_result,
    totalCorrect: r.total_correct ?? undefined,
    totalTestcases: r.total_testcases ?? undefined,
    runtime: r.status_runtime,
    memory: r.status_memory,
    runtimePercentile: pct(r.runtime_percentile),
    memoryPercentile: pct(r.memory_percentile),
    lastTestcase: r.last_testcase,
    codeOutput: r.code_output,
    expectedOutput: r.expected_output,
    stdOutput: r.std_output
  }
}

export async function run(slug: string, questionId: string, lang: string, code: string, input: string): Promise<RunResult> {
  const r = (await http(`/problems/${slug}/interpret_solution/`, {
    method: 'POST',
    referer: `${BASE}/problems/${slug}/`,
    body: { lang, question_id: questionId, typed_code: code, data_input: input }
  })) as { interpret_id?: string; error?: string }
  if (!r.interpret_id) throw new Error(r.error ?? 'LeetCode refused the run request.')
  return poll(r.interpret_id, slug, 'run')
}

export async function submit(slug: string, questionId: string, lang: string, code: string): Promise<RunResult> {
  const r = (await http(`/problems/${slug}/submit/`, {
    method: 'POST',
    referer: `${BASE}/problems/${slug}/`,
    body: { lang, question_id: questionId, typed_code: code }
  })) as { submission_id?: number; error?: string }
  if (!r.submission_id) throw new Error(r.error ?? 'LeetCode refused the submission.')
  const result = await poll(String(r.submission_id), slug, 'submit')
  detailMem.delete(slug)
  return result
}
