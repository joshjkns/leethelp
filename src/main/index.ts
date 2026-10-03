import { app, BrowserWindow, ipcMain, shell, nativeTheme } from 'electron'
import { join } from 'node:path'
import { readFile, writeFile } from 'node:fs/promises'
import { DEFAULT_SETTINGS, type Settings } from '@shared/types'
import * as lc from './leetcode'

let win: BrowserWindow | null = null
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
  win.setVibrancy(settings.vibrancy ? 'under-window' : null)
  win.setBackgroundColor(settings.vibrancy ? '#00000000' : nativeTheme.shouldUseDarkColors ? '#151517' : '#fafafa')
}

function createWindow(): void {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    show: false,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    vibrancy: settings.vibrancy ? 'under-window' : undefined,
    visualEffectState: 'followWindow',
    backgroundColor: settings.vibrancy ? '#00000000' : '#151517',
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
  ipcMain.handle('user:login', async () => {
    const u = await lc.login(win!)
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
  ipcMain.handle('shell:open', (_e, url: string) => {
    if (/^https:\/\//.test(url)) shell.openExternal(url)
  })
}

app.setName('LeetHelp')
app.whenReady().then(async () => {
  await loadSettings()
  registerIpc()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
