import { useEffect, useRef } from 'react'
import Editor from '@monaco-editor/react'
import { initVimMode } from 'monaco-vim'
import { CloudUpload, Code2, Loader2, Play, RotateCcw } from 'lucide-react'
import type { ProblemDetail } from '@shared/types'
import { monaco } from '@/lib/monaco'
import { MONACO_LANG, LANG_LABEL } from '@/lib/langs'
import { useApp } from '@/lib/store'
import { useIsDark } from '@/lib/theme'
import { Button } from '../ui/button'
import { Select } from '../ui/controls'
import { Tooltip } from '../ui/tooltip'
import { Pane } from './Pane'

type Ed = monaco.editor.IStandaloneCodeEditor

export function CodeEditor({
  detail,
  lang,
  onLang,
  code,
  onCode,
  onReset,
  onRun,
  onSubmit,
  busy,
  signedIn
}: {
  detail: ProblemDetail | null
  lang: string
  onLang: (l: string) => void
  code: string
  onCode: (v: string) => void
  onReset: () => void
  onRun: () => void
  onSubmit: () => void
  busy: 'run' | 'submit' | null
  signedIn: boolean
}) {
  const s = useApp((st) => st.settings)
  const dark = useIsDark()
  const editorRef = useRef<Ed | null>(null)
  const vimStatus = useRef<HTMLDivElement>(null)
  const vim = useRef<{ dispose: () => void } | null>(null)

  useEffect(() => {
    const ed = editorRef.current
    if (!ed) return
    if (s.vimMode && !vim.current) vim.current = initVimMode(ed, vimStatus.current)
    if (!s.vimMode && vim.current) {
      vim.current.dispose()
      vim.current = null
    }
  }, [s.vimMode, detail])

  const langs = detail?.snippets.map((sn) => ({ value: sn.langSlug, label: LANG_LABEL[sn.langSlug] ?? sn.lang })) ?? []

  return (
    <Pane
      header={
        <>
          <Code2 className="size-3.5 text-accent" />
          {langs.length > 0 ? (
            <Select size="sm" value={lang} onChange={onLang} options={langs} className="w-32 border-transparent bg-transparent hover:bg-surface-2" />
          ) : (
            <span className="text-[12.5px] font-medium">Code</span>
          )}
          <Tooltip content="Reset to starter code">
            <Button variant="ghost" size="iconSm" onClick={onReset} disabled={!detail}>
              <RotateCcw />
            </Button>
          </Tooltip>
          <div className="flex-1" />
          <Tooltip content="Run sample tests" shortcut={['⌘', "'"]}>
            <Button size="sm" onClick={onRun} disabled={!detail || !!busy}>
              {busy === 'run' ? <Loader2 className="animate-spin" /> : <Play />}
              Run
            </Button>
          </Tooltip>
          <Tooltip content={signedIn ? 'Submit to LeetCode' : 'Sign in to submit'} shortcut={['⌘', '↵']}>
            <Button size="sm" variant="success" onClick={onSubmit} disabled={!detail || !!busy}>
              {busy === 'submit' ? <Loader2 className="animate-spin" /> : <CloudUpload />}
              Submit
            </Button>
          </Tooltip>
        </>
      }
    >
      <div className="relative min-h-0 flex-1 pt-2">
        <Editor
          theme={dark ? 'lh-dark' : 'lh-light'}
          language={MONACO_LANG[lang] ?? 'plaintext'}
          path={detail ? `${detail.slug}.${lang}` : undefined}
          value={code}
          onChange={(v) => onCode(v ?? '')}
          onMount={(ed) => {
            editorRef.current = ed
            if (useApp.getState().settings.vimMode) vim.current = initVimMode(ed, vimStatus.current)
          }}
          loading={<div className="text-xs text-subtle">Loading editor…</div>}
          options={{
            fontFamily: `'${s.editorFontFamily}', 'JetBrains Mono Variable', ui-monospace, Menlo, monospace`,
            fontSize: s.editorFontSize,
            fontLigatures: s.editorLigatures,
            lineHeight: Math.round(s.editorFontSize * 1.6),
            tabSize: s.tabSize,
            minimap: { enabled: s.minimap },
            lineNumbers: s.relativeLineNumbers ? 'relative' : 'on',
            wordWrap: s.wordWrap ? 'on' : 'off',
            automaticLayout: true,
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorSmoothCaretAnimation: 'on',
            cursorBlinking: 'smooth',
            renderLineHighlight: 'all',
            padding: { top: 4, bottom: 12 },
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8, useShadows: false },
            guides: { indentation: true },
            bracketPairColorization: { enabled: true },
            stickyScroll: { enabled: false },
            fixedOverflowWidgets: true
          }}
        />
        <div
          ref={vimStatus}
          className={
            s.vimMode
              ? 'absolute inset-x-0 bottom-0 h-6 border-t border-border bg-surface px-3 font-mono text-[11px] leading-6 text-subtle'
              : 'hidden'
          }
        />
      </div>
    </Pane>
  )
}
