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

/** Which installed agent CLI runs the assistant or generation. */
export type Provider = 'claude' | 'codex'

/** A model pick: the provider, its model id and a reasoning effort it supports. */
export interface ModelChoice {
  provider: Provider
  model: string
  effort: string
}

export interface ModelOption {
  id: string
  label: string
  description: string
  efforts: string[]
  defaultEffort: string
  /** An older model: listed under "More models". */
  legacy?: boolean
}

export interface ProviderInfo {
  id: Provider
  label: string
  /** The CLI was found. */
  installed: boolean
  /** Has a usable login; null when it can't be checked without running it. */
  signedIn: boolean | null
  models: ModelOption[]
  /** Why the models couldn't be listed, if they couldn't. */
  error?: string
}

export type ModelCatalog = Record<Provider, ProviderInfo>

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
  /** Rounded corners on the workspace panels (square by default). */
  roundedPanels: boolean
  uiScale: number
  vibrancy: boolean
  sidebarHidden: boolean
  /** The assistant's default model for new chats; each chat keeps its own after that. */
  assistantModel: ModelChoice
  /** The model the Generate button uses. */
  generateModel: ModelChoice
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
  roundedPanels: false,
  uiScale: 1,
  vibrancy: true,
  sidebarHidden: false,
  assistantModel: { provider: 'claude', model: 'claude-opus-5-5', effort: 'medium' },
  generateModel: { provider: 'claude', model: 'claude-opus-5-5', effort: 'high' }
}

/** What to generate a practice problem about. */
export interface GenerateProblemRequest {
  topic: string
  difficulty: Difficulty
  /** A previous attempt that failed verification, and why, so the model can fix it. */
  retry?: { previous: GeneratedProblem; errors: string[] }
}

/**
 * A generated LeetCode-style problem, exactly as the model returns it. Test values are JSON
 * strings because a strict schema can't describe arbitrary values; the renderer parses them and
 * runs the reference solution against every test before accepting the problem.
 */
export interface GeneratedProblem {
  title: string
  difficulty: Difficulty
  tags: string[]
  statement: string
  constraints: string[]
  hints: string[]
  followUp: string
  fn: string
  params: { name: string; type: string }[]
  returnType: string
  solution: string
  unordered: boolean
  tests: { argsJson: string; expectedJson: string; example: boolean; explanation: string }[]
}

/** Streamed from the assistant's agent loop in the main process. */
export type AssistantEvent =
  | { type: 'session'; id: string }
  | { type: 'text'; text: string }
  /** A new text block started after tool calls: start a new paragraph. */
  | { type: 'text-break' }
  | { type: 'done'; error?: string; costUsd?: number }

/** A tool call the assistant made; the renderer carries it out against the live app and replies. */
export interface AssistantToolCall {
  chatId: string
  callId: string
  name: string
  input: Record<string, unknown>
}

export interface AssistantToolResult {
  text: string
  isError?: boolean
}

export interface AssistantSendRequest {
  chatId: string
  message: string
  /** Resume this session (a Claude session or a Codex thread) so the conversation keeps its memory. */
  sessionId?: string
  model: ModelChoice
  /** The conversation so far, when it moves to a provider that can't resume the old session. */
  history?: string
}

export interface AiStatus {
  /** The `claude` CLI is installed; it's used first, with your Claude Code login. */
  claudeCode: boolean
  /** Where an Anthropic API key comes from: saved in the app (encrypted), the environment, or nowhere. */
  key: 'saved' | 'env' | null
  /** What a generation will actually use, given the model picked in Settings. */
  using: 'claude-code' | 'api' | 'codex' | null
}

export interface Api {
  /** process.platform: 'darwin' gets the inset traffic lights and vibrancy. */
  platform: string
  // auth
  getUser(): Promise<UserStatus>
  /** Opens LeetCode's authorize page in the default browser; the result arrives via onUserChanged. */
  login(): Promise<void>
  /** Fallback: sign in inside an app window (email/password; SSO providers may block it). */
  loginWindow(): Promise<UserStatus>
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
  /** Fired when a browser sign-in completes (or fails). */
  onUserChanged(cb: (user: UserStatus) => void): () => void
  // AI problem generation
  getAiStatus(): Promise<AiStatus>
  setAiKey(key: string | null): Promise<AiStatus>
  generateProblem(req: GenerateProblemRequest): Promise<GeneratedProblem>
  /** Installed providers and their models (Codex's list comes from the CLI). */
  getModels(refresh?: boolean): Promise<ModelCatalog>
  /** Chromium page zoom (⌘+ / ⌘−), separate from the app's own interface scale. */
  getZoomFactor(): number
  assistantSend(req: AssistantSendRequest): Promise<void>
  assistantStop(chatId: string): Promise<void>
  assistantToolResult(callId: string, result: AssistantToolResult): Promise<void>
  onAssistantEvent(cb: (chatId: string, e: AssistantEvent) => void): () => void
  onAssistantTool(cb: (call: AssistantToolCall) => void): () => void
}
