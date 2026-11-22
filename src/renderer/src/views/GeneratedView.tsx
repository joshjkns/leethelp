import { useState } from 'react'
import { CheckCircle2, ChevronRight, CircleDashed, MessageSquare, Sparkles, Trash2 } from 'lucide-react'
import { useApp } from '@/lib/store'
import { useCustomProblems } from '@/lib/custom-problems'
import { useAssistant, chatFor } from '@/lib/assistant'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import { DifficultyPill } from '@/components/DifficultyPill'
import { GenerateDialog } from './GenerateDialog'

/** Original LeetCode-style problems written by Claude, from the Generate button or the assistant. */
export function GeneratedView() {
  const problems = useCustomProblems((s) => s.problems)
  const remove = useCustomProblems((s) => s.remove)
  // Re-render when chats change so the chat links stay current.
  const threads = useAssistant((s) => s.threads)
  const openCustom = useApp((s) => s.openCustom)
  const [generating, setGenerating] = useState(false)
  const solved = problems.filter((p) => p.status === 'ac').length

  const askAssistant = (): void => {
    const a = useAssistant.getState()
    a.setOpen(true)
    if (!a.running) a.newThread()
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[820px] px-8 pb-16 pt-8">
        <header className="drag flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight">Generated</h1>
            <p className="mt-0.5 text-[13px] text-muted">
              Original LeetCode-style problems on any topic, solved from scratch and judged on hidden tests.
              {problems.length > 0 && ` ${solved}/${problems.length} solved.`}
            </p>
          </div>
          <div className="no-drag flex items-center gap-2">
            <Tooltip content="Ask the assistant for a problem" shortcut={['⌘', 'J']}>
              <Button onClick={askAssistant}>
                <MessageSquare /> Ask
              </Button>
            </Tooltip>
            <Button variant="primary" onClick={() => setGenerating(true)}>
              <Sparkles /> Generate
            </Button>
          </div>
        </header>

        {problems.length === 0 ? (
          <div className="no-drag mt-8 flex flex-col items-center rounded-2xl border border-dashed border-border px-6 py-14 text-center">
            <Sparkles className="size-6 text-accent" />
            <div className="mt-3 text-[15px] font-medium">No generated problems yet</div>
            <p className="mt-1 max-w-sm text-[13px] text-muted">
              Generate one on any topic, or ask the assistant for something like “a medium two-pointer problem about intervals”.
            </p>
            <div className="mt-4 flex gap-2">
              <Button variant="primary" onClick={() => setGenerating(true)}>
                <Sparkles /> Generate
              </Button>
              <Button onClick={askAssistant}>
                <MessageSquare /> Ask the assistant
              </Button>
            </div>
          </div>
        ) : (
          <div className="no-drag mt-6 overflow-hidden rounded-2xl border border-border bg-surface">
            {problems.map((p) => (
              <div
                key={p.id}
                role="button"
                tabIndex={0}
                onClick={() => openCustom(p.id)}
                onKeyDown={(e) => e.key === 'Enter' && openCustom(p.id)}
                className="group flex cursor-pointer items-center gap-3 border-b border-border px-4 py-3 last:border-b-0 hover:bg-surface-2/60"
              >
                <span className="flex w-4 justify-center">
                  {p.status === 'ac' ? (
                    <CheckCircle2 className="size-3.5 text-easy" />
                  ) : p.status === 'notac' ? (
                    <CircleDashed className="size-3.5 text-medium" />
                  ) : null}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium">{p.title}</div>
                  <div className="truncate text-[11.5px] text-subtle">{p.tags.join(' · ')}</div>
                </div>
                {chatFor(p.id, threads) && (
                  <Tooltip content="Open chat">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        useAssistant.getState().openChatFor(p.id)
                      }}
                      className="flex size-6 items-center justify-center rounded-md text-subtle hover:bg-surface-2 hover:text-fg"
                    >
                      <MessageSquare className="size-3.5" />
                    </button>
                  </Tooltip>
                )}
                <span className="text-[11.5px] text-subtle">{new Date(p.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                <DifficultyPill difficulty={p.difficulty} />
                <Tooltip content="Delete">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm(`Delete "${p.title}"?`)) remove(p.id)
                    }}
                    className="flex size-6 items-center justify-center rounded-md text-subtle opacity-0 transition-opacity hover:bg-surface-2 hover:text-hard group-hover:opacity-100"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </Tooltip>
                <ChevronRight className="size-3.5 text-subtle" />
              </div>
            ))}
          </div>
        )}
      </div>
      <GenerateDialog open={generating} onOpenChange={setGenerating} />
    </div>
  )
}
