import { useState, type ReactNode } from 'react'
import { Check, Code2, KeyRound, LogOut, Monitor, Moon, Palette, Sun, UserRound, X } from 'lucide-react'
import { toast } from 'sonner'
import { useApp } from '@/lib/store'
import { cn } from '@/lib/utils'
import { COMMON_LANGS, LANG_LABEL } from '@/lib/langs'
import type { Accent, Theme } from '@shared/types'
import { Dialog } from '@/components/ui/dialog'
import { Segmented, Select, Slider, Switch } from '@/components/ui/controls'
import { Button } from '@/components/ui/button'

const ACCENTS: { value: Accent; color: string }[] = [
  { value: 'amber', color: '#f5a623' },
  { value: 'orange', color: '#f76b15' },
  { value: 'rose', color: '#f43f5e' },
  { value: 'violet', color: '#8b5cf6' },
  { value: 'indigo', color: '#6366f1' },
  { value: 'sky', color: '#0ea5e9' },
  { value: 'emerald', color: '#10b981' },
  { value: 'zinc', color: '#a1a1aa' }
]

type Section = 'appearance' | 'editor' | 'account'

export function SettingsDialog() {
  const open = useApp((s) => s.settingsOpen)
  const setOpen = useApp((s) => s.setSettingsOpen)
  const [section, setSection] = useState<Section>('appearance')

  return (
    <Dialog open={open} onOpenChange={setOpen} title="Settings" className="top-[10%] flex h-[560px] w-[760px]">
      <nav className="flex w-48 shrink-0 flex-col gap-0.5 border-r border-border bg-surface-2/50 p-2 pt-4">
        <div className="mb-2 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-subtle">Settings</div>
        {(
          [
            ['appearance', 'Appearance', Palette],
            ['editor', 'Editor', Code2],
            ['account', 'Account', UserRound]
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setSection(id)}
            className={cn(
              'flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium transition-colors',
              section === id ? 'bg-elevated text-fg shadow-sm shadow-black/5 ring-1 ring-border' : 'text-muted hover:text-fg'
            )}
          >
            <Icon className={cn('size-4', section === id && 'text-accent')} />
            {label}
          </button>
        ))}
      </nav>
      <div className="relative min-w-0 flex-1 overflow-y-auto px-7 py-6">
        <button onClick={() => setOpen(false)} className="absolute right-4 top-4 rounded-md p-1 text-subtle hover:bg-surface-2 hover:text-fg">
          <X className="size-4" />
        </button>
        {section === 'appearance' && <Appearance />}
        {section === 'editor' && <EditorSettings />}
        {section === 'account' && <Account />}
      </div>
    </Dialog>
  )
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-6 border-b border-border py-2.5 last:border-0">
      <div>
        <div className="text-[13px] font-medium">{label}</div>
        {hint && <div className="mt-0.5 text-xs text-subtle">{hint}</div>}
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  )
}

function H({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 text-[17px] font-semibold tracking-tight">{children}</h2>
}

function Appearance() {
  const s = useApp((st) => st.settings)
  const set = useApp((st) => st.updateSettings)
  return (
    <>
      <H>Appearance</H>
      <Row label="Theme">
        <Segmented<Theme>
          value={s.theme}
          onChange={(theme) => set({ theme })}
          options={[
            { value: 'light', label: <Sun className="size-3.5" /> },
            { value: 'system', label: <Monitor className="size-3.5" /> },
            { value: 'dark', label: <Moon className="size-3.5" /> }
          ]}
        />
      </Row>
      <Row label="Accent colour">
        <div className="flex gap-1.5">
          {ACCENTS.map((a) => (
            <button
              key={a.value}
              onClick={() => set({ accent: a.value })}
              className={cn(
                'flex size-6 items-center justify-center rounded-full ring-offset-2 ring-offset-elevated transition-transform hover:scale-110',
                s.accent === a.value && 'ring-2 ring-border-strong'
              )}
              style={{ background: a.color }}
              title={a.value}
            >
              {s.accent === a.value && <Check className="size-3 text-white mix-blend-difference" />}
            </button>
          ))}
        </div>
      </Row>
      <Row label="Show sidebar" hint="Toggle anytime with ⌘B">
        <Switch checked={!s.sidebarHidden} onChange={(v) => set({ sidebarHidden: !v })} />
      </Row>
      <Row label="Translucent sidebar" hint="macOS vibrancy behind the sidebar">
        <Switch checked={s.vibrancy} onChange={(vibrancy) => set({ vibrancy })} />
      </Row>
      <Row label="Interface scale">
        <Slider value={s.uiScale} min={0.85} max={1.25} step={0.05} onChange={(uiScale) => set({ uiScale })} />
        <span className="w-10 text-right text-xs tabular-nums text-muted">{Math.round(s.uiScale * 100)}%</span>
      </Row>
      <Row label="Code on the left" hint="Swap the description and editor panes">
        <Switch checked={s.swapPanes} onChange={(swapPanes) => set({ swapPanes })} />
      </Row>
      <Row label="Show topic tags in problem list">
        <Switch checked={s.showTagsInList} onChange={(showTagsInList) => set({ showTagsInList })} />
      </Row>
      <Row label="Hide Premium problems">
        <Switch checked={s.hidePaid} onChange={(hidePaid) => set({ hidePaid })} />
      </Row>
    </>
  )
}

function EditorSettings() {
  const s = useApp((st) => st.settings)
  const set = useApp((st) => st.updateSettings)
  return (
    <>
      <H>Editor</H>
      <Row label="Default language">
        <Select
          value={s.language}
          onChange={(language) => set({ language })}
          className="w-36"
          options={COMMON_LANGS.map((l) => ({ value: l, label: LANG_LABEL[l] }))}
        />
      </Row>
      <Row label="Font">
        <Select
          value={s.editorFontFamily}
          onChange={(editorFontFamily) => set({ editorFontFamily })}
          className="w-44"
          options={[
            { value: 'JetBrains Mono Variable', label: 'JetBrains Mono' },
            { value: 'SF Mono', label: 'SF Mono' },
            { value: 'Menlo', label: 'Menlo' },
            { value: 'Fira Code', label: 'Fira Code' },
            { value: 'Monaco', label: 'Monaco' }
          ]}
        />
      </Row>
      <Row label="Font size">
        <Slider value={s.editorFontSize} min={11} max={22} onChange={(editorFontSize) => set({ editorFontSize })} />
        <span className="w-10 text-right text-xs tabular-nums text-muted">{s.editorFontSize}px</span>
      </Row>
      <Row label="Tab size">
        <Segmented
          value={String(s.tabSize)}
          onChange={(v) => set({ tabSize: Number(v) })}
          options={[
            { value: '2', label: '2' },
            { value: '4', label: '4' },
            { value: '8', label: '8' }
          ]}
        />
      </Row>
      <Row label="Vim mode">
        <Switch checked={s.vimMode} onChange={(vimMode) => set({ vimMode })} />
      </Row>
      <Row label="Font ligatures">
        <Switch checked={s.editorLigatures} onChange={(editorLigatures) => set({ editorLigatures })} />
      </Row>
      <Row label="Relative line numbers">
        <Switch checked={s.relativeLineNumbers} onChange={(relativeLineNumbers) => set({ relativeLineNumbers })} />
      </Row>
      <Row label="Word wrap">
        <Switch checked={s.wordWrap} onChange={(wordWrap) => set({ wordWrap })} />
      </Row>
      <Row label="Minimap">
        <Switch checked={s.minimap} onChange={(minimap) => set({ minimap })} />
      </Row>
    </>
  )
}

function Account() {
  const user = useApp((s) => s.user)
  const refreshUser = useApp((s) => s.refreshUser)
  const [session, setSession] = useState('')
  const [csrf, setCsrf] = useState('')
  const [saving, setSaving] = useState(false)

  const saveCookies = async (): Promise<void> => {
    setSaving(true)
    try {
      const u = await window.api.setCookies(session, csrf)
      if (u.signedIn) {
        toast.success(`Signed in as ${u.username}`)
        setSession('')
        setCsrf('')
      } else toast.error('Those cookies did not authenticate. Double-check and try again.')
      await refreshUser()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <H>Account</H>
      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2/60 p-3.5">
        {user.avatar ? (
          <img src={user.avatar} className="size-10 rounded-full" alt="" />
        ) : (
          <div className="flex size-10 items-center justify-center rounded-full bg-surface-2">
            <UserRound className="size-4 text-subtle" />
          </div>
        )}
        <div className="flex-1">
          <div className="text-[13px] font-semibold">{user.signedIn ? user.username : 'Not signed in'}</div>
          <div className="text-xs text-subtle">{user.signedIn ? (user.premium ? 'LeetCode Premium' : 'LeetCode') : 'Sign in to run and submit code'}</div>
        </div>
        {user.signedIn ? (
          <Button
            size="sm"
            onClick={async () => {
              await window.api.logout()
              await refreshUser()
            }}
          >
            <LogOut /> Sign out
          </Button>
        ) : (
          <Button size="sm" variant="primary" onClick={() => window.api.login().then(() => refreshUser())}>
            Sign in
          </Button>
        )}
      </div>

      <div className="mt-6">
        <div className="flex items-center gap-2 text-[13px] font-medium">
          <KeyRound className="size-3.5 text-accent" /> Sign in with cookies
        </div>
        <p className="mt-1 text-xs leading-relaxed text-subtle">
          If the sign-in window is blocked (e.g. Google/GitHub SSO), copy <code className="text-muted">LEETCODE_SESSION</code> and{' '}
          <code className="text-muted">csrftoken</code> from your browser’s DevTools → Application → Cookies on leetcode.com.
        </p>
        <div className="mt-3 space-y-2">
          <input
            value={session}
            onChange={(e) => setSession(e.target.value)}
            placeholder="LEETCODE_SESSION"
            className="h-9 w-full rounded-lg border border-border bg-surface-2 px-3 font-mono text-xs outline-none focus:border-border-strong"
          />
          <input
            value={csrf}
            onChange={(e) => setCsrf(e.target.value)}
            placeholder="csrftoken"
            className="h-9 w-full rounded-lg border border-border bg-surface-2 px-3 font-mono text-xs outline-none focus:border-border-strong"
          />
          <Button variant="primary" size="sm" disabled={!session || !csrf || saving} onClick={saveCookies}>
            Save & verify
          </Button>
        </div>
      </div>
    </>
  )
}
