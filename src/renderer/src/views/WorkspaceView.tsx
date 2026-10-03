import { useCallback, useEffect, useRef, useState } from 'react'
import { Group, Panel, Separator, useDefaultLayout } from 'react-resizable-panels'
import { toast } from 'sonner'
import { useApp } from '@/lib/store'
import type { ProblemDetail, RunResult } from '@shared/types'
import { Description } from '@/components/workspace/Description'
import { CodeEditor } from '@/components/workspace/CodeEditor'
import { Console, type TestCase } from '@/components/workspace/Console'

function parseCases(detail: ProblemDetail): TestCase[] {
  const lines = detail.exampleTestcases.split('\n')
  const n = detail.params.length
  if (n === 0 || lines.length % n !== 0) return [{ values: [detail.exampleTestcases] }]
  const out: TestCase[] = []
  for (let i = 0; i < lines.length; i += n) out.push({ values: lines.slice(i, i + n) })
  return out
}

const draftKey = (slug: string, lang: string): string => `code:${slug}:${lang}`

export function WorkspaceView() {
  const slug = useApp((s) => s.slug)!
  const settings = useApp((s) => s.settings)
  const user = useApp((s) => s.user)
  const refreshUser = useApp((s) => s.refreshUser)
  const refreshProfile = useApp((s) => s.refreshProfile)
  const active = useApp((s) => s.view === 'workspace')

  const [detail, setDetail] = useState<ProblemDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lang, setLang] = useState(settings.language)
  const [code, setCode] = useState('')
  const [cases, setCases] = useState<TestCase[]>([])
  const [result, setResult] = useState<RunResult | null>(null)
  const [busy, setBusy] = useState<'run' | 'submit' | null>(null)
  const [consoleTab, setConsoleTab] = useState<'cases' | 'result'>('cases')

  // Load problem
  useEffect(() => {
    let cancelled = false
    setDetail(null)
    setError(null)
    setResult(null)
    setConsoleTab('cases')
    window.api
      .getProblem(slug)
      .then((d) => {
        if (cancelled) return
        setDetail(d)
        setCases(parseCases(d))
        const preferred = localStorage.getItem(`lang:${slug}`) ?? useApp.getState().settings.language
        const l = d.snippets.find((s) => s.langSlug === preferred)?.langSlug ?? d.snippets[0]?.langSlug ?? preferred
        setLang(l)
      })
      .catch((e: Error) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [slug])

  // Load draft (or starter code) whenever problem/language changes
  useEffect(() => {
    if (!detail) return
    const saved = localStorage.getItem(draftKey(detail.slug, lang))
    setCode(saved ?? detail.snippets.find((s) => s.langSlug === lang)?.code ?? '')
  }, [detail, lang])

  const onCode = useCallback(
    (v: string) => {
      setCode(v)
      if (detail) localStorage.setItem(draftKey(detail.slug, lang), v)
    },
    [detail, lang]
  )

  const changeLang = (l: string): void => {
    setLang(l)
    localStorage.setItem(`lang:${slug}`, l)
  }

  const resetCode = (): void => {
    if (!detail) return
    localStorage.removeItem(draftKey(detail.slug, lang))
    setCode(detail.snippets.find((s) => s.langSlug === lang)?.code ?? '')
  }

  const execute = async (kind: 'run' | 'submit'): Promise<void> => {
    if (!detail || busy) return
    if (!useApp.getState().user.signedIn) {
      toast('Sign in to run code', {
        description: 'Running and submitting go through your LeetCode account.',
        action: { label: 'Sign in', onClick: () => window.api.login().then(() => refreshUser()) }
      })
      return
    }
    setBusy(kind)
    setConsoleTab('result')
    setResult(null)
    try {
      const input = cases.map((c) => c.values.join('\n')).join('\n')
      const r =
        kind === 'run'
          ? await window.api.run(detail.slug, detail.questionId, lang, code, input)
          : await window.api.submit(detail.slug, detail.questionId, lang, code)
      setResult(r)
      if (kind === 'submit' && r.statusCode === 10) {
        toast.success('Accepted', { description: `${detail.title} — ${r.runtime ?? ''} · beats ${r.runtimePercentile?.toFixed(1) ?? '–'}%` })
        setDetail((d) => (d ? { ...d, status: 'ac' } : d))
        refreshProfile()
      }
    } catch (e) {
      toast.error((e as Error).message)
      setConsoleTab('cases')
    } finally {
      setBusy(null)
    }
  }

  // ⌘' run, ⌘↵ submit (capture phase so Monaco doesn't eat them)
  const execRef = useRef(execute)
  execRef.current = execute
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent): void => {
      if (!e.metaKey) return
      if (e.key === "'") {
        e.preventDefault()
        e.stopPropagation()
        execRef.current('run')
      } else if (e.key === 'Enter') {
        e.preventDefault()
        e.stopPropagation()
        execRef.current('submit')
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [active])

  const outer = useDefaultLayout({ id: 'ws-outer', storage: localStorage })
  const inner = useDefaultLayout({ id: 'ws-inner', storage: localStorage })

  const descPanel = (
    <Panel id="desc" minSize="22" defaultSize="42" className="flex flex-col">
      <Description detail={detail} error={error} />
    </Panel>
  )
  const codePanel = (
    <Panel id="code" minSize="30" defaultSize="58" className="flex flex-col">
      <Group orientation="vertical" id="ws-inner" defaultLayout={inner.defaultLayout} onLayoutChanged={inner.onLayoutChanged}>
        <Panel id="editor" minSize="20" defaultSize="64" className="flex flex-col">
          <CodeEditor
            detail={detail}
            lang={lang}
            onLang={changeLang}
            code={code}
            onCode={onCode}
            onReset={resetCode}
            onRun={() => execute('run')}
            onSubmit={() => execute('submit')}
            busy={busy}
            signedIn={user.signedIn}
          />
        </Panel>
        <Separator />
        <Panel id="console" minSize="12" defaultSize="36" className="flex flex-col">
          <Console
            detail={detail}
            cases={cases}
            setCases={setCases}
            result={result}
            busy={busy}
            tab={consoleTab}
            setTab={setConsoleTab}
            onResetCases={() => detail && setCases(parseCases(detail))}
          />
        </Panel>
      </Group>
    </Panel>
  )

  return (
    <div className="flex min-h-0 flex-1 p-2 pt-3">
      <Group orientation="horizontal" id="ws-outer" defaultLayout={outer.defaultLayout} onLayoutChanged={outer.onLayoutChanged}>
        {settings.swapPanes ? codePanel : descPanel}
        <Separator />
        {settings.swapPanes ? descPanel : codePanel}
      </Group>
    </div>
  )
}
