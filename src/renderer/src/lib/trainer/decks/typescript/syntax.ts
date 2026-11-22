import type { Card } from '../../types'

export const syntax: Card[] = [
  {
    id: 'ts.syn.nullish',
    cat: 'syntax',
    kind: 'choice',
    prompt: 'What are `a` and `b`?',
    code: `const n = 0\nconst a = n || 10\nconst b = n ?? 10`,
    options: ['a = 10, b = 0', 'a = 0, b = 10', 'a = 10, b = 10', 'a = 0, b = 0'],
    answer: 0,
    codeOptions: false,
    explain:
      '`||` falls back on any falsy value (0, "", NaN, false, null, undefined). `??` only falls back on null or undefined. Use `??` for counts: `(map.get(k) ?? 0) + 1`.'
  },
  {
    id: 'ts.syn.optional-chain',
    cat: 'syntax',
    kind: 'choice',
    prompt: 'What does the last line evaluate to?',
    code: `const m = new Map<string, number[]>()\nm.get('x')?.length`,
    options: ['undefined', '0', 'null', 'TypeError'],
    answer: 0,
    explain: '`?.` stops and returns `undefined` when the left side is null or undefined, so there is no TypeError.'
  },
  {
    id: 'ts.syn.map-decl',
    cat: 'syntax',
    kind: 'type',
    prompt: 'Declare an empty Map from string to number[] named `groups`.',
    answer: 'const groups = new Map<string, number[]>()',
    accept: [
      'const groups: Map<string, number[]> = new Map()',
      'const groups: Map<string, number[]> = new Map<string, number[]>()',
      'let groups = new Map<string, number[]>()',
      'const groups = new Map<string, Array<number>>()'
    ],
    placeholder: 'const groups = …',
    explain: 'Put the type arguments on the constructor: `new Map<K, V>()`. A bare `new Map()` is typed `Map<any, any>`.'
  },
  {
    id: 'ts.syn.tuple',
    cat: 'syntax',
    kind: 'choice',
    prompt: 'Which type describes a list of `[value, count]` pairs?',
    options: ['[number, number][]', 'number[][2]', '(number | number)[]', '{ number, number }[]'],
    answer: 0,
    explain:
      '`[A, B]` is a tuple type and `[A, B][]` is an array of them. `number[][]` also works but loses the fixed length. `Object.entries` and `[...map]` give you tuples.'
  },
  {
    id: 'ts.syn.non-null',
    cat: 'syntax',
    kind: 'choice',
    prompt: 'What does the `!` do here?',
    code: `const j = seen.get(need)!`,
    options: [
      'Tells TS the value is not null/undefined; nothing happens at runtime',
      'Throws if the value is undefined',
      'Converts the value to a boolean',
      'Negates the value'
    ],
    answer: 0,
    codeOptions: false,
    explain:
      'The non-null assertion only affects types. Use it right after a `has()` check. If you are wrong, you just get `undefined` at runtime.'
  },
  {
    id: 'ts.syn.for-in',
    cat: 'syntax',
    kind: 'choice',
    prompt: 'What gets logged?',
    code: `for (const x in [10, 20, 30]) console.log(x)`,
    options: ['"0" "1" "2" (strings)', '10 20 30', '0 1 2 (numbers)', 'Nothing, for…in is for objects only'],
    answer: 0,
    codeOptions: false,
    explain: '`for…in` loops over keys, and keys are always strings. Use `for…of` for values, or `for (const [i, x] of arr.entries())` for both.'
  },
  {
    id: 'ts.syn.record',
    cat: 'syntax',
    kind: 'type',
    prompt: 'Type for a plain object that maps characters to counts.',
    answer: 'Record<string, number>',
    accept: ['{ [key: string]: number }', '{ [k: string]: number }', '{ [c: string]: number }', '{ [char: string]: number }', '{ [ch: string]: number }'],
    placeholder: 'type Counts = …',
    explain: '`Record<K, V>` is the short form of an index signature `{ [key: string]: number }`. In interviews a `Map` is usually the better choice.'
  },
  {
    id: 'ts.syn.swap',
    cat: 'syntax',
    kind: 'type',
    prompt: 'Swap `nums[i]` and `nums[j]` in one statement.',
    answer: '[nums[i], nums[j]] = [nums[j], nums[i]]',
    accept: ['[nums[j], nums[i]] = [nums[i], nums[j]]'],
    explain: 'Destructuring assignment swaps without a temp variable. If the previous line has no semicolon, start this one with `;` so it isn\'t read as an index into that line.'
  },
  {
    id: 'ts.syn.int-div',
    cat: 'syntax',
    kind: 'type',
    prompt: 'Integer-divide positive numbers `a` by `b`.',
    answer: 'Math.floor(a / b)',
    check: [
      { setup: 'const a = 7, b = 2', expected: 3 },
      { setup: 'const a = 9, b = 3', expected: 3 },
      { setup: 'const a = 1, b = 4', expected: 0 }
    ],
    explain: 'There is no integer type, so `7 / 2` is `3.5`. Use `Math.floor` (or `Math.trunc` to round toward zero for negatives). `(a / b) | 0` only works for 32-bit values.'
  },
  {
    id: 'ts.syn.arrow-object',
    cat: 'syntax',
    kind: 'choice',
    prompt: 'What does `f()` return?',
    code: `const f = () => { count: 1 }`,
    options: ['undefined', '{ count: 1 }', '1', 'SyntaxError'],
    answer: 0,
    explain:
      'The braces are parsed as a function body with a label `count:`, so nothing is returned. Wrap an object literal in parentheses: `() => ({ count: 1 })`.'
  },
  {
    id: 'ts.syn.typeof-null',
    cat: 'syntax',
    kind: 'choice',
    prompt: 'What is `typeof null`?',
    options: ["'object'", "'null'", "'undefined'", "'NaN'"],
    answer: 0,
    explain: 'A historical quirk. To check for null, use `x === null`, or `x == null` to catch both null and undefined.'
  },
  {
    id: 'ts.syn.const-array',
    cat: 'syntax',
    kind: 'choice',
    prompt: 'What happens?',
    code: `const arr = [1, 2]\narr.push(3)`,
    options: ['Works: arr is [1, 2, 3]', 'Compile error: arr is const', 'Runtime TypeError', 'push returns a new array; arr is unchanged'],
    answer: 0,
    codeOptions: false,
    explain: '`const` stops the variable from being reassigned, not the array from being changed. For that, use `readonly number[]` or `as const`.'
  },
  {
    id: 'ts.syn.readonly',
    cat: 'syntax',
    kind: 'choice',
    prompt: 'What happens?',
    code: `const a: readonly number[] = [1]\na.push(2)`,
    options: ["Compile error: 'push' does not exist on readonly number[]", 'Works', 'Runtime TypeError', 'push is silently ignored'],
    answer: 0,
    codeOptions: false,
    explain: '`readonly` arrays remove the mutating methods from the type. It is a compile-time check only.'
  },
  {
    id: 'ts.syn.arrays-ref',
    cat: 'syntax',
    kind: 'choice',
    prompt: 'What does the last line return?',
    code: `const seen = new Set<number[]>()\nseen.add([1, 2])\nseen.has([1, 2])`,
    options: ['false', 'true', 'TypeError', 'undefined'],
    answer: 0,
    explain:
      'Arrays and objects are compared by reference, and each `[1, 2]` is a new array. To store coordinates in a Set or Map, use string keys like `${r},${c}`.'
  },
  {
    id: 'ts.syn.grid-key',
    cat: 'syntax',
    kind: 'type',
    prompt: 'Make a string key for grid cell `r`, `c` (e.g. "2,3") to use in a Set.',
    answer: '`${r},${c}`',
    check: [
      { setup: 'const r = 2, c = 3', expected: '2,3' },
      { setup: 'const r = 10, c = 0', expected: '10,0' }
    ],
    explain: 'Template literals make the key. For speed you can encode as a number: `r * cols + c`.'
  },
  {
    id: 'ts.syn.copy',
    cat: 'syntax',
    kind: 'type',
    prompt: 'Make a shallow copy of array `a` in one expression.',
    answer: '[...a]',
    accept: ['a.slice()', 'Array.from(a)', 'a.concat()', 'structuredClone(a)', 'a.slice(0)'],
    explain: 'Spread copies only the top level, so nested arrays are still shared. `structuredClone(a)` makes a deep copy.'
  },
  {
    id: 'ts.syn.private',
    cat: 'syntax',
    kind: 'choice',
    prompt: 'Which line correctly declares a field inside a class body?',
    options: ['private items: number[] = []', 'let items: number[] = []', 'this.items: number[] = []', 'items private: number[] = []'],
    answer: 0,
    explain: 'Fields go directly in the class body, with an optional `private`/`readonly`. JS `#items` private fields work too. Design questions like MinStack or LRUCache need this.'
  },
  {
    id: 'ts.syn.listnode',
    cat: 'syntax',
    kind: 'choice',
    prompt: "How does LeetCode's TypeScript `ListNode` type its `next` pointer?",
    options: ['next: ListNode | null', 'next?: ListNode', 'next: ListNode | undefined', 'next: ListNode'],
    answer: 0,
    explain: 'LeetCode uses `| null` throughout (`TreeNode.left`, `ListNode.next`). Return `null`, not `undefined`, for empty lists and trees.'
  },
  {
    id: 'ts.syn.optional-param',
    cat: 'syntax',
    kind: 'choice',
    prompt: 'Inside the function, what is the type of `memo`?',
    code: `function fib(n: number, memo?: Map<number, number>) { … }`,
    options: ['Map<number, number> | undefined', 'Map<number, number>', 'Map<number, number> | null', 'any'],
    answer: 0,
    explain: '`?` makes the parameter optional, which adds `| undefined`. A default like `memo = new Map<number, number>()` removes the `undefined`.'
  },
  {
    id: 'ts.syn.union',
    cat: 'syntax',
    kind: 'choice',
    prompt: 'Which can an `interface` NOT describe?',
    options: ["A union like 'L' | 'R'", 'An object with methods', 'An object with optional properties', 'A function signature'],
    answer: 0,
    codeOptions: false,
    explain: "Unions need a `type` alias: `type Dir = 'L' | 'R'`. Interfaces only describe object shapes (callable ones included)."
  },
  {
    id: 'ts.syn.generic',
    cat: 'syntax',
    kind: 'choice',
    prompt: 'Which is a correct generic signature?',
    options: [
      'function last<T>(arr: T[]): T | undefined',
      'function last(arr: T[]): T',
      'function last<T>(arr: <T>[]): T',
      'function<T> last(arr: T[]): T'
    ],
    answer: 0,
    explain: 'Type parameters go after the function name. Return `T | undefined` because the array might be empty.'
  },
  {
    id: 'ts.syn.float',
    cat: 'syntax',
    kind: 'choice',
    prompt: 'What does `0.1 + 0.2 === 0.3` evaluate to?',
    options: ['false', 'true', 'TypeError', 'NaN'],
    answer: 0,
    explain: 'All numbers are IEEE-754 doubles. Compare floats with a tolerance: `Math.abs(a - b) < 1e-9`.'
  },
  {
    id: 'ts.syn.entries-loop',
    cat: 'syntax',
    kind: 'type',
    prompt: 'Complete the loop header to get both index `i` and value `x` of `arr`.',
    code: `for (___) { … }`,
    answer: 'const [i, x] of arr.entries()',
    accept: ['let [i, x] of arr.entries()'],
    explain: '`arr.entries()` yields `[index, value]` pairs. A plain indexed `for` loop is just as good, and often clearer.'
  }
]
