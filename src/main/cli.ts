// Finds the installed agent CLIs (`claude`, `codex`) the way your terminal would. Apps opened from
// Finder or the Start menu get a minimal PATH, so on macOS ask a login shell, then fall back to the
// usual install locations.
import { execFile } from 'node:child_process'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { access, constants } from 'node:fs/promises'

export interface Shell {
  bin: string
  /** PATH from a login shell, for the CLI and anything it spawns. */
  path: string
}

type Name = 'claude' | 'codex'
const found = new Map<Name, Promise<Shell | null>>()

export function findCli(name: Name): Promise<Shell | null> {
  let p = found.get(name)
  if (!p) {
    p = process.platform === 'win32' ? findWindows(name) : findUnix(name)
    found.set(name, p)
    // Not installed yet? Look again next time (they may install it while the app is open).
    p.then((r) => r || found.delete(name))
  }
  return p
}

export const findClaude = (): Promise<Shell | null> => findCli('claude')
export const findCodex = (): Promise<Shell | null> => findCli('codex')

async function exists(path: string, mode: number): Promise<boolean> {
  try {
    await access(path, mode)
    return true
  } catch {
    return false
  }
}

async function findUnix(name: Name): Promise<Shell | null> {
  const sh = process.env.SHELL || '/bin/zsh'
  const fromShell = await new Promise<{ bin: string; path: string } | null>((resolve) =>
    execFile(sh, ['-lc', `printf "%s\\n%s" "$(command -v ${name})" "$PATH"`], { timeout: 5000 }, (err, out) => {
      if (err) return resolve(null)
      const [bin, path] = out.trim().split('\n')
      resolve({ bin: bin?.trim() ?? '', path: path?.trim() ?? '' })
    })
  )
  const path = [fromShell?.path || process.env.PATH || '', '/opt/homebrew/bin', '/usr/local/bin'].filter(Boolean).join(':')
  const home = homedir()
  const candidates = [
    fromShell?.bin,
    ...(name === 'claude' ? [join(home, '.claude/local/claude')] : []),
    join(home, `.local/bin/${name}`),
    `/opt/homebrew/bin/${name}`,
    `/usr/local/bin/${name}`,
    join(home, `.npm-global/bin/${name}`)
  ]
  for (const c of candidates) if (c && (await exists(c, constants.X_OK))) return { bin: c, path }
  return null
}

/** Windows: the PATH is already the user's, so ask `where`, then try the usual install locations. */
async function findWindows(name: Name): Promise<Shell | null> {
  const path = process.env.PATH || ''
  const fromWhere = await new Promise<string[]>((resolve) =>
    execFile('where', [name], { timeout: 5000 }, (err, out) =>
      resolve(err ? [] : out.split(/\r?\n/).map((l) => l.trim()).filter(Boolean))
    )
  )
  const home = homedir()
  // Claude's SDK can only spawn an .exe; codex (spawned here) may be npm's .cmd shim.
  const ok = (c: string): boolean => /\.exe$/i.test(c) || (name === 'codex' && /\.cmd$/i.test(c))
  const candidates = [
    ...fromWhere.filter(ok),
    join(home, '.local', 'bin', `${name}.exe`),
    ...(name === 'claude' ? [join(home, '.claude', 'local', 'claude.exe')] : [])
  ]
  for (const c of candidates) if (await exists(c, constants.F_OK)) return { bin: c, path }
  return null
}
