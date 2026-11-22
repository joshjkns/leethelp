import { memo, useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Check, Copy } from 'lucide-react'
import { monaco } from '@/lib/monaco'
import { useApp } from '@/lib/store'

const LANGS: Record<string, string> = { ts: 'typescript', tsx: 'typescript', js: 'javascript', py: 'python', sh: 'shell' }

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const ligatures = useApp((s) => s.settings.editorLigatures)
  const [html, setHtml] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    let live = true
    monaco.editor.colorize(code, LANGS[lang] ?? (lang || 'typescript'), { tabSize: 2 }).then((h) => live && setHtml(h))
    return () => {
      live = false
    }
  }, [code, lang])
  return (
    <div className="group relative my-2">
      <div
        className="trainer-code select-text overflow-x-auto rounded-xl border border-border bg-bg/60 px-3 py-2.5 font-mono text-[12px] leading-[1.6]"
        style={{ fontVariantLigatures: ligatures ? undefined : 'none' }}
      >
        {html ? <div dangerouslySetInnerHTML={{ __html: html }} /> : <pre>{code}</pre>}
      </div>
      <button
        onClick={() => {
          navigator.clipboard.writeText(code)
          setCopied(true)
          setTimeout(() => setCopied(false), 1200)
        }}
        className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-md bg-surface text-subtle opacity-0 ring-1 ring-border transition-opacity hover:text-fg group-hover:opacity-100"
      >
        {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      </button>
    </div>
  )
}

/** The assistant's markdown: GitHub-flavoured, with highlighted code and links opened in the browser. */
export const Markdown = memo(function Markdown({ text }: { text: string }) {
  return (
    <div className="assistant-md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre: ({ children }) => <>{children}</>,
          code: ({ className, children }) => {
            const m = /language-(\w+)/.exec(className ?? '')
            const code = String(children ?? '')
            if (m || code.includes('\n')) return <CodeBlock code={code.replace(/\n$/, '')} lang={m?.[1] ?? ''} />
            return <code>{children}</code>
          },
          a: ({ href, children }) => (
            <a
              href={href}
              onClick={(e) => {
                e.preventDefault()
                const slug = href?.match(/leetcode\.com\/problems\/([^/?#]+)/)?.[1]
                if (slug && useApp.getState().bySlug.has(slug)) useApp.getState().openProblem(slug)
                else if (href?.startsWith('https://')) window.api.openExternal(href)
              }}
            >
              {children}
            </a>
          )
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  )
})
