import { create } from 'zustand'
import { toast } from 'sonner'
import {
  DEFAULT_SETTINGS,
  type DailyChallenge,
  type ProblemList,
  type ProblemSummary,
  type Profile,
  type Settings,
  type UserStatus
} from '@shared/types'

export type View = 'problems' | 'lists' | 'workspace' | 'graph' | 'progress' | 'learn' | 'generated' | 'custom'

interface State {
  view: View
  slug: string | null
  listId: string
  /** The AI-generated problem open in the custom workspace. */
  customId: string | null
  graphSeed: string | null
  settingsOpen: boolean
  paletteOpen: boolean

  settings: Settings
  user: UserStatus
  profile: Profile | null
  daily: DailyChallenge | null
  list: ProblemList | null
  bySlug: Map<string, ProblemSummary>
  loadingList: boolean

  setView: (v: View) => void
  openProblem: (slug: string) => void
  openList: (id: string) => void
  openCustom: (id: string) => void
  exploreFrom: (slug: string | null) => void
  setSettingsOpen: (o: boolean) => void
  setPaletteOpen: (o: boolean) => void
  updateSettings: (patch: Partial<Settings>) => void
  setList: (l: ProblemList) => void
  refreshUser: () => Promise<void>
  /** Starts the browser sign-in; completion arrives through onUserChanged (see init). */
  signIn: () => Promise<void>
  refreshProfile: () => Promise<void>
  init: () => Promise<void>
}

const SIGNED_OUT: UserStatus = { signedIn: false, username: null, avatar: null, premium: false }

export const useApp = create<State>((set, get) => ({
  view: 'problems',
  slug: localStorage.getItem('lastSlug'),
  listId: localStorage.getItem('lastList') ?? 'neetcode150',
  customId: null,
  graphSeed: null,
  settingsOpen: false,
  paletteOpen: false,

  settings: DEFAULT_SETTINGS,
  user: SIGNED_OUT,
  profile: null,
  daily: null,
  list: null,
  bySlug: new Map(),
  loadingList: true,

  setView: (view) => set({ view }),
  openProblem: (slug) => {
    localStorage.setItem('lastSlug', slug)
    set({ slug, view: 'workspace', paletteOpen: false })
  },
  openList: (listId) => {
    localStorage.setItem('lastList', listId)
    set({ listId, view: 'lists' })
  },
  openCustom: (customId) => set({ customId, view: 'custom', paletteOpen: false }),
  exploreFrom: (slug) => set({ graphSeed: slug, view: 'graph', paletteOpen: false }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),

  updateSettings: (patch) => {
    set({ settings: { ...get().settings, ...patch } })
    window.api.setSettings(patch)
  },

  setList: (list) => set({ list, bySlug: new Map(list.problems.map((p) => [p.slug, p])), loadingList: false }),

  refreshUser: async () => {
    const user = await window.api.getUser().catch(() => SIGNED_OUT)
    set({ user })
    if (user.signedIn) await get().refreshProfile()
    else set({ profile: null })
  },

  signIn: async () => {
    try {
      await window.api.login()
      toast('Finish signing in in your browser', {
        description: 'Click Authorize on leetcode.com and LeetHelp will pick up your session.'
      })
    } catch (e) {
      toast.error((e as Error).message)
    }
  },

  refreshProfile: async () => {
    const u = get().user.username
    if (!u) return
    const profile = await window.api.getProfile(u).catch(() => null)
    if (profile) set({ profile })
  },

  init: async () => {
    const settings = await window.api.getSettings()
    set({ settings })
    window.api.onUserChanged(async (u) => {
      await get().refreshUser()
      if (u.signedIn) toast.success(`Signed in as ${u.username}`)
      else toast.error('LeetCode didn’t sign you in', { description: 'Try again, or paste cookies in Settings → Account.' })
    })
    window.api.onProblemsUpdated((l) => {
      get().setList(l)
      get().refreshProfile()
    })
    window.api
      .getProblems()
      .then((l) => get().setList(l))
      .catch(() => set({ loadingList: false }))
    window.api.getDaily().then((daily) => set({ daily })).catch(() => {})
    get().refreshUser()
  }
}))
