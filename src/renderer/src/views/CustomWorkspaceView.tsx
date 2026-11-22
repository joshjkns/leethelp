import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Group, Panel, Separator, useDefaultLayout } from 'react-resizable-panels'
import { toast } from 'sonner'
import type { RunResult } from '@shared/types'
import { useApp } from '@/lib/store'
import { draftKey, exampleCases, judgeRun, judgeSubmit, starterCode, toDetail, useCustomProblems } from '@/lib/custom-problems'
import { preloadCompiler } from '@/lib/trainer/runner'
import { Description } from '@/components/workspace/Description'
import { CodeEditor } from '@/components/workspace/CodeEditor'
import { Console, type TestCase } from '@/components/workspace/Console'
import { registerWorkspace } from '@/lib/workspace-bridge'
import { useAssistant, useChatFor } from '@/lib/assistant'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import { MessageSquare } from 'lucide-react'

/** The LeetCode-style workspace for an AI-generated problem, judged locally instead of by LeetCode. */
export function CustomWorkspaceView() {
  const id = useApp((s) => s.customId)
  const settings = useApp((s) => s.settings)
  const setView = useApp((s) => s.setView)
  const problem = useCustomProblems((s) => s.problems.find((p) => p.id === id) ?? null)
  const setStatus = useCustomProblems((s) => s.setStatus)
  const chatId = useChatFor(problem?.id ?? null)

  const detail = useMemo(() => (problem ? toDetail(problem) : null), [problem])
  const [code, setCode] = useState('')
  const [cases, setCases] = useState<TestCase[]>([])
  const [result, setResult] = useState<RunResult | null>(null)
  const [busy, setBusy] = useState<'run' | 'submit' | null>(null)
  const [consoleTab, setConsoleTab] = useState<'cases' | 'result'>('cases')

  useEffect(preloadCompiler, [])

  // Load the draft (or starter code) and the example cases when the problem changes.
  useEffect(() => {
    if (!problem) return
    setCode(localStorage.getItem(draftKey(problem.id)) ?? starterCode(problem))
    setCases(exampleCases(problem))
    setResult(null)
    setConsoleTab('cases')
    // Only when switching problems, not when its status changes.
  }, [problem?.id])

  const onCode = useCallback(
    (v: string) => {
      setCode(v)
      if (problem) localStorage.setItem(draftKey(problem.id), v)
    },
    [problem]
  )

  const resetCode = (): void => {
    if (!problem) return
    localStorage.removeItem(draftKey(problem.id))
    setCode(starterCode(problem))
  }

  const execute = async (kind: 'run' | 'submit'): Promise<RunResult | null> => {
    if (!problem || busy) return null
    setBusy(kind)
    setConsoleTab('result')
    setResult(null)
    try {
      // Refs, so code the assistant just wrote is used even before React re-renders.
      const src = codeRef.current
      const r = kind === 'run' ? await judgeRun(problem, src, casesRef.current) : await judgeSubmit(problem, src)
      setResult(r)
      resultRef.current = r
      if (kind === 'submit') {
        if (r.statusCode === 10) {
          toast.success('Accepted', { description: `${problem.title}: ${r.totalTestcases} tests passed` })
          setStatus(problem.id, 'ac')
        } else if (problem.status !== 'ac') setStatus(problem.id, 'notac')
      }
      return r
    } catch (e) {
      toast.error((e as Error).message)
      setConsoleTab('cases')
      throw e
    } finally {
      setBusy(null)
    }
  }

  // ⌘' run, ⌘↵ submit (capture phase so Monaco doesn't eat them)
  const execRef = useRef(execute)
  execRef.current = execute

  // Let the assistant read and drive this workspace.
  const codeRef = useRef(code)
  codeRef.current = code
  const casesRef = useRef(cases)
  casesRef.current = cases
  const resultRef = useRef(result)
  resultRef.current = result
  const onCodeRef = useRef(onCode)
  onCodeRef.current = onCode
  useEffect(() => {
    if (!problem) return
    return registerWorkspace({
      kind: 'custom',
      id: problem.id,
      title: problem.title,
      lang: 'typescript',
      params: problem.params,
      getCode: () => codeRef.current,
      setCode: (c) => {
        codeRef.current = c
        onCodeRef.current(c)
      },
      getCases: () => casesRef.current,
      setCases: (c) => {
        casesRef.current = c
        setCases(c)
      },
      lastResult: () => resultRef.current,
      run: () => execRef.current('run'),
      submit: () => execRef.current('submit')
    })
  }, [problem?.id])
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (!e.metaKey || document.querySelector('[role="dialog"]')) return
      if (e.key === "'") {
        e.preventDefault()
        e.stopPropagation()
        execRef.current('run').catch(() => {})
      } else if (e.key === 'Enter') {
        e.preventDefault()
        e.stopPropagation()
        execRef.current('submit').catch(() => {})
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])

  const outer = useDefaultLayout({ id: 'gen-outer', storage: localStorage })
  const inner = useDefaultLayout({ id: 'gen-inner', storage: localStorage })

  if (!problem) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-[13px] text-muted">
        This problem no longer exists.
        <button className="text-accent hover:underline" onClick={() => setView('learn')}>
          Back to Learn
        </button>
      </div>
    )
  }

  const descPanel = (
    <Panel id="gen-desc" minSize="22" defaultSize="42" className="flex flex-col">
      <Description
        detail={detail}
        error={null}
        local
        inset={settings.sidebarHidden && !settings.swapPanes}
        actions={
          chatId && (
            <Tooltip content="Open the chat that made this problem">
              <Button variant="ghost" size="sm" onClick={() => useAssistant.getState().openChatFor(problem.id)}>
                <MessageSquare /> Chat
              </Button>
            </Tooltip>
          )
        }
      />
    </Panel>
  )
  const codePanel = (
    <Panel id="gen-code" minSize="30" defaultSize="58" className="flex flex-col">
      <Group orientation="vertical" id="gen-inner" defaultLayout={inner.defaultLayout} onLayoutChanged={inner.onLayoutChanged}>
        <Panel id="gen-editor" minSize="20" defaultSize="64" className="flex flex-col">
          <CodeEditor
            detail={detail}
            lang="typescript"
            onLang={() => {}}
            code={code}
            onCode={onCode}
            onReset={resetCode}
            onRun={() => execute('run').catch(() => {})}
            onSubmit={() => execute('submit').catch(() => {})}
            busy={busy}
            signedIn
            local
            inset={settings.sidebarHidden && settings.swapPanes}
          />
        </Panel>
        <Separator />
        <Panel id="gen-console" minSize="12" defaultSize="36" className="flex flex-col">
          <Console
            detail={detail}
            cases={cases}
            setCases={setCases}
            result={result}
            busy={busy}
            tab={consoleTab}
            setTab={setConsoleTab}
            onResetCases={() => setCases(exampleCases(problem))}
          />
        </Panel>
      </Group>
    </Panel>
  )

  return (
    <div
      className={settings.roundedPanels ? 'flex min-h-0 flex-1 p-2 pt-3' : 'flex min-h-0 flex-1'}
      style={settings.sidebarHidden ? { paddingTop: 'max(4px, calc(23.5px * var(--tb, 1) - 20px))' } : undefined}
    >
      <Group orientation="horizontal" id="gen-outer" defaultLayout={outer.defaultLayout} onLayoutChanged={outer.onLayoutChanged}>
        {settings.swapPanes ? codePanel : descPanel}
        <Separator />
        {settings.swapPanes ? descPanel : codePanel}
      </Group>
    </div>
  )
}
