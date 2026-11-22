import { contextBridge, ipcRenderer, webFrame } from 'electron'
import type { Api, AssistantEvent, AssistantToolCall, ProblemList, UserStatus } from '@shared/types'

// IPC errors arrive as "Error invoking remote method 'x': Error: msg" — keep just the message.
const call = <T>(channel: string, ...args: unknown[]): Promise<T> =>
  ipcRenderer.invoke(channel, ...args).catch((e: Error) => {
    throw new Error(e.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, ''))
  })

const api: Api = {
  platform: process.platform,
  getUser: () => call('user:get'),
  login: () => call('user:login'),
  loginWindow: () => call('user:login-window'),
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
  getZoomFactor: () => webFrame.getZoomFactor(),
  getAiStatus: () => call('ai:status'),
  setAiKey: (key) => call('ai:key', key),
  generateProblem: (req) => call('ai:generate', req),
  getModels: (refresh) => call('ai:models', refresh),
  assistantSend: (req) => call('assistant:send', req),
  assistantStop: (chatId) => call('assistant:stop', chatId),
  assistantToolResult: (callId, result) => call('assistant:tool-result', callId, result),
  onAssistantEvent: (cb) => {
    const h = (_e: unknown, m: { chatId: string; event: AssistantEvent }): void => cb(m.chatId, m.event)
    ipcRenderer.on('assistant:event', h)
    return () => ipcRenderer.removeListener('assistant:event', h)
  },
  onAssistantTool: (cb) => {
    const h = (_e: unknown, c: AssistantToolCall): void => cb(c)
    ipcRenderer.on('assistant:tool', h)
    return () => ipcRenderer.removeListener('assistant:tool', h)
  },
  onUserChanged: (cb) => {
    const h = (_e: unknown, u: UserStatus): void => cb(u)
    ipcRenderer.on('user:changed', h)
    return () => ipcRenderer.removeListener('user:changed', h)
  },
  onProblemsUpdated: (cb) => {
    const h = (_e: unknown, l: ProblemList): void => cb(l)
    ipcRenderer.on('problems:updated', h)
    return () => ipcRenderer.removeListener('problems:updated', h)
  }
}

contextBridge.exposeInMainWorld('api', api)
