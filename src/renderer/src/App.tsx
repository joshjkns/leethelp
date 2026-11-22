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
import { ListsView } from '@/views/ListsView'
import { LearnView } from '@/views/LearnView'
import { CustomWorkspaceView } from '@/views/CustomWorkspaceView'
import { GeneratedView } from '@/views/GeneratedView'
import { AssistantPanel, useAssistantWidth } from '@/components/assistant/AssistantPanel'
import { initAssistant, useAssistant } from '@/lib/assistant'

export function App() {
  const init = useApp((s) => s.init)
  const settings = useApp((s) => s.settings)
  const updateSettings = useApp((s) => s.updateSettings)
  const view = useApp((s) => s.view)
  const slug = useApp((s) => s.slug)
  const assistantOpen = useAssistant((s) => s.open)
  const assistantWidth = useAssistantWidth((s) => s.width)
  const resizingAssistant = useAssistantWidth((s) => s.resizing)
  const dark = useIsDark()

  useEffect(() => {
    init()
    initAssistant()
  }, [init])

  useEffect(() => {
    const el = document.documentElement
    el.classList.toggle('dark', dark)
    el.classList.toggle('no-vibrancy', !settings.vibrancy || window.api.platform !== 'darwin')
    // Width the native window controls take at the top left: the traffic lights on macOS, nothing elsewhere.
    el.style.setProperty('--lights', window.api.platform === 'darwin' ? '90px' : '16px')
    el.classList.toggle('flat-panels', !settings.roundedPanels)
    el.dataset.accent = settings.accent
    el.style.zoom = String(settings.uiScale)
  }, [dark, settings.accent, settings.vibrancy, settings.uiScale, settings.roundedPanels])

  // The traffic lights are native and ignore page zoom and the interface scale, so anything placed
  // beside them is sized in screen points: CSS px × --tb. Zooming fires a resize, so recompute then.
  useEffect(() => {
    const apply = (): void =>
      document.documentElement.style.setProperty('--tb', String(1 / (window.api.getZoomFactor() * settings.uiScale)))
    apply()
    window.addEventListener('resize', apply)
    return () => window.removeEventListener('resize', apply)
  }, [settings.uiScale])

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
      } else if (e.key === 'j') {
        e.preventDefault()
        const a = useAssistant.getState()
        a.setOpen(!a.open)
      } else if (['1', '2', '3', '4', '5', '6', '7'].includes(e.key)) {
        e.preventDefault()
        const v = (['problems', 'lists', 'workspace', 'graph', 'progress', 'learn', 'generated'] as const)[Number(e.key) - 1]
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
          {/* With the sidebar hidden, reserve a title-bar strip so content clears the traffic lights.
              The workspaces don't need it: their top-left panel header sits beside the lights instead. */}
          {settings.sidebarHidden && (view === 'workspace' || view === 'custom') ? (
            <div className="drag absolute inset-x-0 top-0 h-1" />
          ) : settings.sidebarHidden ? (
            <div className="drag shrink-0" style={{ height: 'calc(46px * var(--tb, 1))' }} />
          ) : settings.roundedPanels || (view !== 'workspace' && view !== 'custom') ? (
            <div className="drag absolute inset-x-0 top-0 h-3" />
          ) : null}
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
              {view === 'lists' && <ListsView />}
              {view === 'graph' && <GraphView />}
              {view === 'progress' && <ProgressView />}
              {view === 'learn' && <LearnView />}
              {view === 'generated' && <GeneratedView />}
              {view === 'custom' && <CustomWorkspaceView />}
            </motion.div>
          )}
        </main>
        <motion.div
          className="shrink-0 overflow-hidden"
          initial={false}
          animate={{ width: assistantOpen ? assistantWidth : 0 }}
          transition={resizingAssistant ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 40 }}
        >
          {assistantOpen && <AssistantPanel />}
        </motion.div>
      </div>
      {/* Icon starts 12pt right of the zoom button; centred on the lights' 23.5pt line. */}
      <div
        className="no-drag fixed z-30"
        style={{ left: 'calc(var(--lights, 90px) * var(--tb, 1) - 4px)', top: 'calc(23.5px * var(--tb, 1) - 12px)' }}
      >
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
