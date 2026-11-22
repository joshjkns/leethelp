// Card model for the language trainer. Decks are plain data, one file per category.

export type Category = 'syntax' | 'functions' | 'logic' | 'problems'

export const CATEGORIES: { id: Category; label: string; blurb: string }[] = [
  { id: 'syntax', label: 'Syntax', blurb: 'Types, narrowing, operators and the bits of TS you reach for under pressure.' },
  { id: 'functions', label: 'Key functions', blurb: 'Array, string, Map and Set methods: what they return and what they mutate.' },
  { id: 'logic', label: 'Logic', blurb: 'Patterns and gotchas: binary search bounds, windows, stacks, queues.' },
  { id: 'problems', label: 'Problems', blurb: 'Classic LeetCode solutions with a piece missing. Fill it in and run the tests.' }
]

interface Base {
  /** Stable id; progress and mistakes are stored against it. */
  id: string
  cat: Category
  /** The question, plain text with `inline code`. */
  prompt: string
  /** Optional TypeScript shown under the prompt. */
  code?: string
  /** Shown after answering, right or wrong. Plain text with `inline code`. */
  explain: string
}

/** Pick one of the options with 1–4. */
export interface ChoiceCard extends Base {
  kind: 'choice'
  options: string[]
  /** Index into options. */
  answer: number
  /** Render options as code. Defaults to true. */
  codeOptions?: boolean
}

/** Type a short answer. Matched against `accept` after normalising, else evaluated with `check`. */
export interface TypeCard extends Base {
  kind: 'type'
  /** Canonical answer shown when revealing. */
  answer: string
  /** Extra accepted answers (the canonical one is always accepted). */
  accept?: string[]
  /**
   * Evaluate the typed expression instead of relying only on text matches: `setup` runs first,
   * then the expression's value is deep-compared with `expected`. Several cases must all pass.
   */
  check?: Check | Check[]
  placeholder?: string
}

export interface Check {
  setup?: string
  expected: unknown
}

export interface TestCase {
  args: unknown[]
  expected: unknown
}

/** A full solution with a hole (`___`) to fill in, graded by running tests. */
export interface BlankCard extends Base {
  kind: 'blank'
  title: string
  /** LeetCode slug, for opening the real problem. */
  slug?: string
  /** Solution with exactly one `___` marking the gap. */
  template: string
  /** What goes in the gap, shown on reveal. */
  answer: string
  /** Function under test. */
  fn: string
  tests: TestCase[]
  /** Compare arrays ignoring order (top-level, and each nested array's order too). */
  unordered?: boolean
  /** Generated with AI and saved locally, rather than part of the built-in deck. */
}

export type Card = ChoiceCard | TypeCard | BlankCard

export interface Deck {
  lang: string
  label: string
  cards: Card[]
}
