import { app, BrowserWindow, ipcMain, shell, nativeTheme } from 'electron'
import { join } from 'node:path'
import { readFile, writeFile } from 'node:fs/promises'
import { DEFAULT_SETTINGS, type Settings } from '@shared/types'
import * as lc from './leetcode'
import * as ai from './ai'
import * as assistant from './assistant'

let win: BrowserWindow | null = null
const mac = process.platform === 'darwin'
/** Vibrancy is macOS-only; elsewhere the window always has a solid background. */
const vibrant = (): boolean => mac && settings.vibrancy
let settings: Settings = { ...DEFAULT_SETTINGS }
const settingsPath = (): string => join(app.getPath('userData'), 'settings.json')

async function loadSettings(): Promise<void> {
  try {
    settings = { ...DEFAULT_SETTINGS, ...JSON.parse(await readFile(settingsPath(), 'utf8')) }
  } catch {
    settings = { ...DEFAULT_SETTINGS }
  }
}

function applyWindowSettings(): void {
  nativeTheme.themeSource = settings.theme
  if (!win) return
  if (mac) win.setVibrancy(settings.vibrancy ? 'under-window' : null)
  win.setBackgroundColor(vibrant() ? '#00000000' : nativeTheme.shouldUseDarkColors ? '#151517' : '#fafafa')
}

function createWindow(): void {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    show: false,
    ...(mac
      ? {
          titleBarStyle: 'hiddenInset' as const,
          // Red button's left edge 18pt in, centre 23.5pt down: centred in the 46pt title strip.
          // The renderer keeps the controls beside them in screen points (see --tb in App.tsx).
          trafficLightPosition: { x: 18, y: 16 },
          vibrancy: settings.vibrancy ? ('under-window' as const) : undefined,
          visualEffectState: 'followWindow' as const
        }
      : // Windows and Linux keep the native frame (and its window controls); the menu bar hides until Alt.
        { autoHideMenuBar: true }),
    backgroundColor: vibrant() ? '#00000000' : '#151517',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })
  applyWindowSettings()

  win.once('ready-to-show', () => win?.show())
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
  win.on('closed', () => (win = null))

  if (process.env.ELECTRON_RENDERER_URL) win.loadURL(process.env.ELECTRON_RENDERER_URL)
  else win.loadFile(join(__dirname, '../renderer/index.html'))
}

function registerIpc(): void {
  const send = (channel: string, payload: unknown): void => win?.webContents.send(channel, payload)

  ipcMain.handle('user:get', () => lc.getUser())
  ipcMain.handle('user:login', () => lc.openBrowserLogin())
  ipcMain.handle('user:login-window', async () => {
    const u = await lc.loginWindow(win!)
    if (u.signedIn) lc.refreshProblems().then((l) => send('problems:updated', l)).catch(() => {})
    return u
  })
  ipcMain.handle('user:logout', async () => {
    await lc.logout()
    lc.refreshProblems().then((l) => send('problems:updated', l)).catch(() => {})
  })
  ipcMain.handle('user:cookies', async (_e, s: string, c: string) => {
    const u = await lc.setCookies(s, c)
    if (u.signedIn) lc.refreshProblems().then((l) => send('problems:updated', l)).catch(() => {})
    return u
  })

  ipcMain.handle('problems:list', (_e, force?: boolean) =>
    lc.getProblems(!!force, (l) => send('problems:updated', l))
  )
  ipcMain.handle('problems:get', (_e, slug: string) => lc.getProblem(slug))
  ipcMain.handle('problems:similar', (_e, slug: string) => lc.getSimilar(slug))
  ipcMain.handle('profile:get', (_e, username: string) => lc.getProfile(username))
  ipcMain.handle('daily:get', () => lc.getDaily())
  ipcMain.handle('code:run', (_e, slug, qid, lang, code, input) => lc.run(slug, qid, lang, code, input))
  ipcMain.handle('code:submit', async (_e, slug, qid, lang, code) => {
    const r = await lc.submit(slug, qid, lang, code)
    if (r.statusCode === 10) lc.refreshProblems().then((l) => send('problems:updated', l)).catch(() => {})
    return r
  })

  ipcMain.handle('settings:get', () => settings)
  ipcMain.handle('settings:set', async (_e, patch: Partial<Settings>) => {
    settings = { ...settings, ...patch }
    applyWindowSettings()
    await writeFile(settingsPath(), JSON.stringify(settings, null, 2))
    return settings
  })
  ipcMain.handle('ai:status', () => ai.status())
  ipcMain.handle('ai:key', (_e, key: string | null) => ai.setKey(key))
  ipcMain.handle('ai:generate', (_e, req) => ai.generate(req))
  // The chat runs in the background and streams events; the call returns straight away.
  ipcMain.handle('assistant:send', (_e, req) => void assistant.send(req, send))
  ipcMain.handle('assistant:stop', (_e, chatId: string) => assistant.stop(chatId))
  ipcMain.handle('assistant:tool-result', (_e, callId: string, result) => assistant.toolResult(callId, result))
  ipcMain.handle('shell:open', (_e, url: string) => {
    if (/^https:\/\//.test(url)) shell.openExternal(url)
  })
}

// ───────── browser sign-in callback (see lc.openBrowserLogin) ─────────

async function handleUrl(url: string): Promise<void> {
  await app.whenReady()
  const u = await lc.handleAuthUrl(url).catch(() => ({ signedIn: false, username: null, avatar: null, premium: false }))
  if (!u) return
  if (win) {
    if (win.isMinimized()) win.restore()
    win.show()
    win.focus()
  }
  win?.webContents.send('user:changed', u)
  if (u.signedIn) lc.refreshProblems().then((l) => win?.webContents.send('problems:updated', l)).catch(() => {})
}

// macOS delivers links via open-url (also on cold launch, before ready); Windows/Linux start a
// second instance with the link in argv, so keep one instance and forward it.
app.on('open-url', (e, url) => {
  e.preventDefault()
  handleUrl(url)
})
if (!app.requestSingleInstanceLock()) app.quit()
app.on('second-instance', (_e, argv) => {
  const url = argv.find(lc.isAuthUrl)
  if (url) handleUrl(url)
  else win?.focus()
})

app.setName('LeetHelp')
app.whenReady().then(async () => {
  await loadSettings()
  registerIpc()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('will-quit', () => lc.releaseAuthScheme())

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
