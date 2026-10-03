export type Difficulty = 'Easy' | 'Medium' | 'Hard'
export type ProblemStatus = 'ac' | 'notac' | null

export interface Tag {
  name: string
  slug: string
}

export interface ProblemSummary {
  id: string // frontend id, e.g. "1"
  title: string
  slug: string
  difficulty: Difficulty
  acRate: number
  paidOnly: boolean
  status: ProblemStatus
  tags: string[] // tag slugs
}

export interface ProblemList {
  problems: ProblemSummary[]
  tags: Record<string, string> // slug -> display name
  fetchedAt: number
}

export interface SimilarQuestion {
  title: string
  slug: string
  difficulty: Difficulty
}

export interface CodeSnippet {
  lang: string
  langSlug: string
  code: string
}

export interface ProblemDetail {
  questionId: string
  id: string
  title: string
  slug: string
  content: string | null
  difficulty: Difficulty
  likes: number
  dislikes: number
  paidOnly: boolean
  status: ProblemStatus
  tags: Tag[]
  snippets: CodeSnippet[]
  exampleTestcases: string
  params: { name: string; type: string }[]
  similar: SimilarQuestion[]
  hints: string[]
  acRate: string
  totalAccepted: string
  totalSubmission: string
}

export interface UserStatus {
  signedIn: boolean
  username: string | null
  avatar: string | null
  premium: boolean
}

export interface DifficultyCount {
  difficulty: 'All' | Difficulty
  count: number
}

export interface TagProgress {
  tagName: string
  tagSlug: string
  problemsSolved: number
}

export interface RecentAc {
  title: string
  slug: string
  timestamp: number
}

export interface Profile {
  username: string
  avatar: string | null
  realName: string | null
  ranking: number | null
  solved: DifficultyCount[]
  totals: DifficultyCount[]
  beats: { difficulty: Difficulty; percentage: number | null }[]
  streak: number
  totalActiveDays: number
  calendar: Record<string, number> // unix day -> submissions
  recent: RecentAc[]
  tagProgress: TagProgress[]
}

export interface DailyChallenge {
  date: string
  slug: string
  title: string
  difficulty: Difficulty
  id: string
}

export interface RunResult {
  kind: 'run' | 'submit'
  state: string
  statusCode: number
  statusMsg: string
  runSuccess: boolean
  compileError?: string
  runtimeError?: string
  // run
  codeAnswer?: string[]
  expectedAnswer?: string[]
  stdout?: string[]
  compareResult?: string
  // submit
  totalCorrect?: number
  totalTestcases?: number
  runtime?: string
  memory?: string
  runtimePercentile?: number | null
  memoryPercentile?: number | null
  lastTestcase?: string
  codeOutput?: string
  expectedOutput?: string
  stdOutput?: string
}

export type Theme = 'system' | 'light' | 'dark'
export type Accent = 'amber' | 'orange' | 'emerald' | 'sky' | 'indigo' | 'violet' | 'rose' | 'zinc'

export interface Settings {
  theme: Theme
  accent: Accent
  language: string
  editorFontSize: number
  editorFontFamily: string
  editorLigatures: boolean
  tabSize: number
  vimMode: boolean
  minimap: boolean
  relativeLineNumbers: boolean
  wordWrap: boolean
  showTagsInList: boolean
  hidePaid: boolean
  swapPanes: boolean
  uiScale: number
  vibrancy: boolean
  sidebarHidden: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  accent: 'amber',
  language: 'python3',
  editorFontSize: 14,
  editorFontFamily: 'JetBrains Mono Variable',
  editorLigatures: true,
  tabSize: 4,
  vimMode: false,
  minimap: false,
  relativeLineNumbers: false,
  wordWrap: false,
  showTagsInList: true,
  hidePaid: false,
  swapPanes: false,
  uiScale: 1,
  vibrancy: true,
  sidebarHidden: false
}

export interface Api {
  // auth
  getUser(): Promise<UserStatus>
  login(): Promise<UserStatus>
  logout(): Promise<void>
  setCookies(session: string, csrf: string): Promise<UserStatus>
  // data
  getProblems(force?: boolean): Promise<ProblemList>
  getProblem(slug: string): Promise<ProblemDetail>
  getSimilar(slug: string): Promise<SimilarQuestion[]>
  getProfile(username: string): Promise<Profile>
  getDaily(): Promise<DailyChallenge | null>
  run(slug: string, questionId: string, lang: string, code: string, input: string): Promise<RunResult>
  submit(slug: string, questionId: string, lang: string, code: string): Promise<RunResult>
  // settings
  getSettings(): Promise<Settings>
  setSettings(patch: Partial<Settings>): Promise<Settings>
  openExternal(url: string): Promise<void>
  onProblemsUpdated(cb: (list: ProblemList) => void): () => void
}
