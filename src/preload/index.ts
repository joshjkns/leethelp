import { contextBridge, ipcRenderer } from 'electron'
import type { Api, ProblemList } from '@shared/types'

// IPC errors arrive as "Error invoking remote method 'x': Error: msg" — keep just the message.
const call = <T>(channel: string, ...args: unknown[]): Promise<T> =>
  ipcRenderer.invoke(channel, ...args).catch((e: Error) => {
    throw new Error(e.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, ''))
  })

const api: Api = {
  getUser: () => call('user:get'),
  login: () => call('user:login'),
  logout: () => call('user:logout'),
  setCookies: (s, c) => call('user:cookies', s, c),
  getProblems: (force) => call('problems:list', force),
  getProblem: (slug) => call('problems:get', slug),
  getSimilar: (slug) => call('problems:similar', slug),
  getProfile: (u) => call('profile:get', u),
  getDaily: () => call('daily:get'),
  run: (slug, qid, lang, code, input) => call('code:run', slug, qid, lang, code, input),
  submit: (slug, qid, lang, code) => call('code:submit', slug, qid, lang, code),
  getSettings: () => call('settings:get'),
  setSettings: (patch) => call('settings:set', patch),
  openExternal: (url) => call('shell:open', url),
  onProblemsUpdated: (cb) => {
    const h = (_e: unknown, l: ProblemList): void => cb(l)
    ipcRenderer.on('problems:updated', h)
    return () => ipcRenderer.removeListener('problems:updated', h)
  }
}

contextBridge.exposeInMainWorld('api', api)
