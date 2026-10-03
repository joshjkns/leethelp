import { useEffect } from 'react'
import { Toaster } from 'sonner'
import { motion } from 'motion/react'
import { PanelLeft } from 'lucide-react'
import { useApp } from '@/lib/store'
import { useIsDark } from '@/lib/theme'
import { Tooltip, TooltipProvider } from '@/components/ui/tooltip'
import { Sidebar } from '@/components/Sidebar'
import { CommandPalette } from '@/components/CommandPalette'
import { SettingsDialog } from '@/views/SettingsDialog'
import { ProblemsView } from '@/views/ProblemsView'
import { WorkspaceView } from '@/views/WorkspaceView'
import { GraphView } from '@/views/GraphView'
import { ProgressView } from '@/views/ProgressView'

export function App() {
  const init = useApp((s) => s.init)
  const settings = useApp((s) => s.settings)
  const updateSettings = useApp((s) => s.updateSettings)
  const view = useApp((s) => s.view)
  const slug = useApp((s) => s.slug)
  const dark = useIsDark()

  useEffect(() => {
    init()
  }, [init])

  useEffect(() => {
    const el = document.documentElement
    el.classList.toggle('dark', dark)
    el.classList.toggle('no-vibrancy', !settings.vibrancy)
    el.dataset.accent = settings.accent
    el.style.zoom = String(settings.uiScale)
  }, [dark, settings.accent, settings.vibrancy, settings.uiScale])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (!e.metaKey) return
      const s = useApp.getState()
      if (e.key === 'k' || e.key === 'p') {
        e.preventDefault()
        s.setPaletteOpen(!s.paletteOpen)
      } else if (e.key === 'b' && !e.shiftKey) {
        e.preventDefault()
        s.updateSettings({ sidebarHidden: !s.settings.sidebarHidden })
      } else if (e.key === ',') {
        e.preventDefault()
        s.setSettingsOpen(true)
      } else if (['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault()
        const v = (['problems', 'workspace', 'graph', 'progress'] as const)[Number(e.key) - 1]
        if (v === 'workspace' && !s.slug) return
        s.setView(v)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])

  return (
    <TooltipProvider>
      <div className="flex h-full">
        <motion.div
          className="shrink-0 overflow-hidden"
          initial={false}
          animate={{ width: settings.sidebarHidden ? 0 : 228 }}
          transition={{ type: 'spring', stiffness: 420, damping: 40 }}
        >
          <Sidebar />
        </motion.div>
        <main className={`relative flex min-w-0 flex-1 flex-col bg-bg ${settings.sidebarHidden ? '' : 'border-l border-border'}`}>
          {/* With the sidebar hidden, reserve a title-bar strip so content clears the traffic lights. */}
          {settings.sidebarHidden ? <div className="drag h-9 shrink-0" /> : <div className="drag absolute inset-x-0 top-0 h-3" />}
          {/* The workspace stays mounted so the editor, scroll position and console survive view switches. */}
          {slug && (
            <div className={view === 'workspace' ? 'flex min-h-0 flex-1 flex-col' : 'hidden'}>
              <WorkspaceView />
            </div>
          )}
          {view !== 'workspace' && (
            <motion.div
              key={view}
              className="flex min-h-0 flex-1 flex-col"
              initial={{ opacity: 0.6, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.12, ease: 'easeOut' }}
            >
              {view === 'problems' && <ProblemsView />}
              {view === 'graph' && <GraphView />}
              {view === 'progress' && <ProgressView />}
            </motion.div>
          )}
        </main>
      </div>
      <div className="no-drag fixed left-[84px] top-[11px] z-30">
        <Tooltip content={settings.sidebarHidden ? 'Show sidebar' : 'Hide sidebar'} shortcut={['⌘', 'B']}>
          <button
            onClick={() => updateSettings({ sidebarHidden: !settings.sidebarHidden })}
            className="flex size-6 items-center justify-center rounded-md text-subtle transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <PanelLeft className="size-4" />
          </button>
        </Tooltip>
      </div>
      <CommandPalette />
      <SettingsDialog />
      <Toaster
        theme={dark ? 'dark' : 'light'}
        position="bottom-right"
        toastOptions={{
          className: '!rounded-xl !border-border-strong !bg-elevated !text-fg !shadow-xl !font-sans'
        }}
      />
    </TooltipProvider>
  )
}
