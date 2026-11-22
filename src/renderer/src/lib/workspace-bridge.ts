// Lets the assistant reach into the open workspace: read and replace the editor's code, change
// the console's cases, and press Run or Submit. Each workspace view registers a handle while mounted.
import type { RunResult } from '@shared/types'
import type { TestCase } from '@/components/workspace/Console'
import { useApp } from './store'

export interface WorkspaceHandle {
  kind: 'leetcode' | 'custom'
  /** LeetCode slug, or the generated problem's id. */
  id: string
  title: string
  lang: string
  params: { name: string; type: string }[]
  getCode: () => string
  setCode: (code: string) => void
  getCases: () => TestCase[]
  setCases: (cases: TestCase[]) => void
  lastResult: () => RunResult | null
  /** Runs like the Run button; resolves with the result, or null if it couldn't run (e.g. signed out). */
  run: () => Promise<RunResult | null>
  /** Generated problems only. */
  submit?: () => Promise<RunResult | null>
}

const handles: Partial<Record<WorkspaceHandle['kind'], WorkspaceHandle>> = {}

/** Registers a workspace's handle; returns the cleanup. */
export function registerWorkspace(h: WorkspaceHandle): () => void {
  handles[h.kind] = h
  return () => {
    if (handles[h.kind] === h) delete handles[h.kind]
  }
}

/** The workspace on screen, if any. The LeetCode workspace stays mounted, so check the view. */
export function activeWorkspace(): WorkspaceHandle | null {
  const view = useApp.getState().view
  if (view === 'workspace') return handles.leetcode ?? null
  if (view === 'custom') return handles.custom ?? null
  return null
}
