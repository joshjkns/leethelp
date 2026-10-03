import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Difficulty } from '@shared/types'

export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs))

export const difficultyColor: Record<Difficulty, string> = {
  Easy: 'text-easy',
  Medium: 'text-medium',
  Hard: 'text-hard'
}

export const difficultyVar: Record<Difficulty, string> = {
  Easy: 'var(--easy)',
  Medium: 'var(--medium)',
  Hard: 'var(--hard)'
}

export const isMac = navigator.platform.toLowerCase().includes('mac')

export function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

export function timeAgo(ts: number): string {
  const s = Math.floor(Date.now() / 1000 - ts)
  if (s < 60) return 'just now'
  const units: [number, string][] = [
    [60 * 60 * 24 * 365, 'y'],
    [60 * 60 * 24 * 30, 'mo'],
    [60 * 60 * 24 * 7, 'w'],
    [60 * 60 * 24, 'd'],
    [60 * 60, 'h'],
    [60, 'm']
  ]
  for (const [n, u] of units) if (s >= n) return `${Math.floor(s / n)}${u} ago`
  return 'just now'
}
