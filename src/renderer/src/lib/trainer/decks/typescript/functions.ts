import type { Card } from '../../types'

export const functions: Card[] = [
  // ── Arrays: splice / slice ──
  {
    id: 'ts.fn.splice-remove',
    cat: 'functions',
    kind: 'choice',
    prompt: 'What are `r` and `a`?',
    code: `const a = [1, 2, 3, 4, 5]\nconst r = a.splice(1, 2)`,
    options: ['r = [2, 3], a = [1, 4, 5]', 'r = [2], a = [1, 3, 4, 5]', 'r = [1, 4, 5], a = [1, 2, 3, 4, 5]', 'r = [2, 3], a = [1, 2, 3, 4, 5]'],
    answer: 0,
    explain: '`splice(start, deleteCount)` changes the array in place and returns the removed elements. The second argument is a count, not an end index.'
  },
  {
    id: 'ts.fn.splice-insert',
    cat: 'functions',
    kind: 'type',
    prompt: 'Insert `9` at index 1 of `a`, in place.',
    answer: 'a.splice(1, 0, 9)',
    explain: '`splice(start, 0, ...items)` deletes nothing and inserts the items at `start`. It is O(n) because the later elements shift.'
  },
  {
    id: 'ts.fn.slice',
    cat: 'functions',
    kind: 'type',
    prompt: 'What does this return?',
    code: `[1, 2, 3, 4, 5].slice(1, 3)`,
    answer: '[2, 3]',
    explain: '`slice(start, end)` returns a copy from `start` up to but not including `end`, and doesn\'t change the original.'
  },
  {
    id: 'ts.fn.slice-neg',
    cat: 'functions',
    kind: 'choice',
    prompt: 'What does this return?',
    code: `[1, 2, 3, 4, 5].slice(-2)`,
    options: ['[4, 5]', '[1, 2, 3]', '[3, 4, 5]', '[]'],
    answer: 0,
    explain: 'Negative indexes count from the end. `slice(-k)` gives the last k elements.'
  },
  {
    id: 'ts.fn.slice-vs-substring',
    cat: 'functions',
    kind: 'choice',
    prompt: 'What are the two results?',
    code: `'hello'.slice(-3)\n'hello'.substring(-3)`,
    options: ["'llo' and 'hello'", "'llo' and 'llo'", "'hel' and 'hello'", "'hello' and 'llo'"],
    answer: 0,
    explain: '`substring` treats negative numbers as 0, while `slice` counts them from the end. Use `slice` for both strings and arrays.'
  },

  // ── Strings ──
  {
    id: 'ts.fn.split-empty',
    cat: 'functions',
    kind: 'choice',
    prompt: 'What does this return?',
    code: `'a,b,,c'.split(',')`,
    options: ["['a', 'b', '', 'c']", "['a', 'b', 'c']", "['a,b,,c']", "['a', 'b', ',', 'c']"],
    answer: 0,
    explain: 'Two separators in a row produce an empty string. To drop empties, use `.filter(Boolean)`. To split on runs of whitespace, use `s.trim().split(/\\s+/)`.'
  },
  {
    id: 'ts.fn.split-chars',
    cat: 'functions',
    kind: 'type',
    prompt: 'Turn string `s` into an array of its characters.',
    answer: "s.split('')",
    check: { setup: "const s = 'abc'", expected: ['a', 'b', 'c'] },
    explain: '`[...s]` and `Array.from(s)` also work, and they handle emoji and other multi-unit characters correctly.'
  },
  {
    id: 'ts.fn.join-default',
    cat: 'functions',
    kind: 'choice',
    prompt: 'What does this return?',
    code: `['a', 'b', 'c'].join()`,
    options: ["'a,b,c'", "'abc'", "'a b c'", "['a', 'b', 'c']"],
    answer: 0,
    explain: 'The default separator is a comma. To join with nothing in between, pass `\'\'`: `chars.join(\'\')`.'
  },
  {
    id: 'ts.fn.reverse-string',
    cat: 'functions',
    kind: 'type',
    prompt: 'Reverse string `s`.',
    answer: "s.split('').reverse().join('')",
    check: [
      { setup: "const s = 'abc'", expected: 'cba' },
      { setup: "const s = 'racecar!'", expected: '!racecar' }
    ],
    explain: 'Strings have no `reverse` method, so go through an array: `[...s].reverse().join(\'\')`.'
  },
  {
    id: 'ts.fn.immutable-string',
    cat: 'functions',
    kind: 'choice',
    prompt: 'What happens?',
    code: `let s = 'cat'\ns[0] = 'b'`,
    options: ['TS error: strings are read-only by index', "s becomes 'bat'", "s becomes 'b'", 'Returns a new string'],
    answer: 0,
    codeOptions: false,
    explain:
      'Strings are immutable. To change characters, make an array (`const a = [...s]`), edit it, then `a.join(\'\')`. Building a string with `+=` in a loop is fine.'
  },
  {
    id: 'ts.fn.charcode',
    cat: 'functions',
    kind: 'type',
    prompt: "Index 0–25 of lowercase letter `c` ('a' → 0).",
    answer: 'c.charCodeAt(0) - 97',
    check: [
      { setup: "const c = 'd'", expected: 3 },
      { setup: "const c = 'z'", expected: 25 }
    ],
    explain: "`'a'.charCodeAt(0)` is 97. Use this to count letters in a fixed 26-slot array, e.g. for anagrams."
  },
  {
    id: 'ts.fn.fromcharcode',
    cat: 'functions',
    kind: 'type',
    prompt: "Letter for index `i` (0 → 'a').",
    answer: 'String.fromCharCode(97 + i)',
    check: [
      { setup: 'const i = 2', expected: 'c' },
      { setup: 'const i = 25', expected: 'z' }
    ],
    explain: '`String.fromCharCode` is the inverse of `charCodeAt`.'
  },
  {
    id: 'ts.fn.alnum',
    cat: 'functions',
    kind: 'type',
    prompt: 'Lowercase `s` and strip everything except letters and digits.',
    answer: "s.toLowerCase().replace(/[^a-z0-9]/g, '')",
    check: [
      { setup: "const s = 'A man, a plan!'", expected: 'amanaplan' },
      { setup: "const s = 'Race_Car 9'", expected: 'racecar9' }
    ],
    explain: 'Without the `g` flag, `replace` only replaces the first match. Note that `_` counts as a word character in `\\w`, so `[^a-z0-9]` is safer.'
  },
  {
    id: 'ts.fn.replace-first',
    cat: 'functions',
    kind: 'choice',
    prompt: 'What does this return?',
    code: `'a-b-c'.replace('-', '')`,
    options: ["'ab-c'", "'abc'", "'a-bc'", "'a-b-c'"],
    answer: 0,
    explain: 'A string pattern replaces only the first match. Use `replaceAll(\'-\', \'\')` or a regex with `/g`.'
  },
  {
    id: 'ts.fn.padstart',
    cat: 'functions',
    kind: 'type',
    prompt: "Pad binary string `b` to 8 characters with leading zeros.",
    answer: "b.padStart(8, '0')",
    check: [
      { setup: "const b = '101'", expected: '00000101' },
      { setup: "const b = '11111111'", expected: '11111111' }
    ],
    explain: '`padStart(length, fill)` pads at the start and `padEnd` at the end. Neither ever truncates.'
  },
  {
    id: 'ts.fn.to-binary',
    cat: 'functions',
    kind: 'type',
    prompt: 'Binary string of non-negative number `n`.',
    answer: 'n.toString(2)',
    check: [
      { setup: 'const n = 5', expected: '101' },
      { setup: 'const n = 8', expected: '1000' }
    ],
    explain: '`toString(radix)` converts to any base from 2 to 36. The reverse is `parseInt(str, radix)`.'
  },
  {
    id: 'ts.fn.parse-binary',
    cat: 'functions',
    kind: 'type',
    prompt: 'Parse binary string `b` into a number.',
    answer: 'parseInt(b, 2)',
    check: [
      { setup: "const b = '101'", expected: 5 },
      { setup: "const b = '1000'", expected: 8 }
    ],
    explain: 'Always pass the radix. `Number(\'0b101\')` also works if the string has the `0b` prefix.'
  },
  {
    id: 'ts.fn.digits',
    cat: 'functions',
    kind: 'type',
    prompt: 'Array of the digits of non-negative integer `n`.',
    answer: "String(n).split('').map(Number)",
    check: [
      { setup: 'const n = 4096', expected: [4, 0, 9, 6] },
      { setup: 'const n = 7', expected: [7] }
    ],
    explain: '`[...String(n)].map(Number)` also works. If an interviewer asks for no string conversion, use `n % 10` and `Math.floor(n / 10)` in a loop.'
  },
  {
    id: 'ts.fn.string-compare',
    cat: 'functions',
    kind: 'choice',
    prompt: "What does `'10' < '9'` evaluate to?",
    options: ['true', 'false', 'TypeError', 'NaN'],
    answer: 0,
    explain: 'Strings compare character by character, and `\'1\'` comes before `\'9\'`. Convert to numbers first if you mean numbers.'
  },

  // ── Sorting ──
  {
    id: 'ts.fn.sort-default',
    cat: 'functions',
    kind: 'choice',
    prompt: 'What does this return?',
    code: `[10, 9, 1, 100].sort()`,
    options: ['[1, 10, 100, 9]', '[1, 9, 10, 100]', '[100, 10, 9, 1]', '[10, 9, 1, 100]'],
    answer: 0,
    explain: 'The default sort converts elements to strings and compares those. Always pass a comparator for numbers.'
  },
  {
    id: 'ts.fn.sort-numeric',
    cat: 'functions',
    kind: 'type',
    prompt: 'Sort `nums` ascending, numerically, in place.',
    answer: 'nums.sort((a, b) => a - b)',
    check: [
      { setup: 'const nums = [10, 9, 1, 100]', expected: [1, 9, 10, 100] },
      { setup: 'const nums = [3, -2, 0]', expected: [-2, 0, 3] }
    ],
    explain: 'A negative comparator result puts `a` first. Use `b - a` for descending. Sorting is O(n log n) and changes the array.'
  },
  {
    id: 'ts.fn.sort-pairs',
    cat: 'functions',
    kind: 'type',
    prompt: 'Sort `pairs` (`[key, count][]`) by count, descending.',
    answer: 'pairs.sort((a, b) => b[1] - a[1])',
    check: {
      setup: "const pairs: [string, number][] = [['a', 1], ['b', 3], ['c', 2]]",
      expected: [
        ['b', 3],
        ['c', 2],
        ['a', 1]
      ]
    },
    explain: 'Destructuring also works: `([, x], [, y]) => y - x`. To break ties, chain with `||`: `b[1] - a[1] || a[0].localeCompare(b[0])`.'
  },
  {
    id: 'ts.fn.sort-strings',
    cat: 'functions',
    kind: 'choice',
    prompt: 'Which comparator sorts `words` alphabetically, ignoring case?',
    options: ['(a, b) => a.localeCompare(b, undefined, { sensitivity: \'base\' })', '(a, b) => a - b', '(a, b) => a < b', '(a, b) => a.length - b.length'],
    answer: 0,
    explain: '`a - b` gives NaN for strings. A comparator that returns a boolean (`a < b`) is a bug because it never returns a negative number. A plain `.sort()` is fine when everything is the same case.'
  },
  {
    id: 'ts.fn.reverse-mutates',
    cat: 'functions',
    kind: 'choice',
    prompt: 'What is `a` at the end?',
    code: `const a = [1, 2, 3]\nconst b = a.reverse()\nb.push(4)`,
    options: ['[3, 2, 1, 4]', '[1, 2, 3]', '[3, 2, 1]', '[1, 2, 3, 4]'],
    answer: 0,
    explain: '`reverse` and `sort` change the array in place and return the same array. `toReversed()` and `toSorted()` return copies.'
  },
  {
    id: 'ts.fn.tosorted',
    cat: 'functions',
    kind: 'choice',
    prompt: 'Which returns a sorted copy and leaves `a` unchanged?',
    options: ['a.toSorted((x, y) => x - y)', 'a.sort((x, y) => x - y)', 'a.sorted((x, y) => x - y)', 'Array.sort(a)'],
    answer: 0,
    explain: '`toSorted`, `toReversed`, `toSpliced` and `with` are ES2023 copying methods. `[...a].sort()` works everywhere.'
  },

  // ── Adding, removing, finding ──
  {
    id: 'ts.fn.push-return',
    cat: 'functions',
    kind: 'choice',
    prompt: 'What does `[1, 2].push(3)` return?',
    options: ['3 (the new length)', '[1, 2, 3]', 'undefined', '3 (the pushed value)'],
    answer: 0,
    codeOptions: false,
    explain: '`push` and `unshift` return the new length. `pop` and `shift` return the removed element, or `undefined` if the array is empty.'
  },
  {
    id: 'ts.fn.last',
    cat: 'functions',
    kind: 'type',
    prompt: 'Last element of `arr` (e.g. the top of a stack).',
    answer: 'arr.at(-1)',
    accept: ['arr[arr.length - 1]'],
    check: { setup: 'const arr = [4, 5, 6]', expected: 6 },
    explain: '`at` accepts negative indexes. With `noUncheckedIndexedAccess`, both forms are typed `T | undefined`.'
  },
  {
    id: 'ts.fn.indexof',
    cat: 'functions',
    kind: 'choice',
    prompt: 'What does `[1, 2, 3].indexOf(4)` return?',
    options: ['-1', 'undefined', 'null', '3'],
    answer: 0,
    explain: 'Watch for `if (arr.indexOf(x))`, which is false when x is at index 0. Use `includes(x)` for a yes/no answer. Both are O(n).'
  },
  {
    id: 'ts.fn.find-vs-findindex',
    cat: 'functions',
    kind: 'choice',
    prompt: 'What does `[5, 12, 8].find(x => x > 20)` return?',
    options: ['undefined', '-1', 'null', '[]'],
    answer: 0,
    explain: '`find` returns the element or `undefined`. `findIndex` returns the index or -1. `findLast`/`findLastIndex` search from the end.'
  },
  {
    id: 'ts.fn.map-parseint',
    cat: 'functions',
    kind: 'choice',
    prompt: 'What does this return?',
    code: `['1', '2', '3'].map(parseInt)`,
    options: ['[1, NaN, NaN]', '[1, 2, 3]', "['1', '2', '3']", 'TypeError'],
    answer: 0,
    explain: '`map` passes `(value, index)`, so the index becomes the radix: `parseInt(\'2\', 1)` is NaN. Use `.map(Number)` instead.'
  },

  // ── Building arrays ──
  {
    id: 'ts.fn.grid',
    cat: 'functions',
    kind: 'type',
    prompt: 'Create an `m` × `n` grid of zeros.',
    answer: 'Array.from({ length: m }, () => Array(n).fill(0))',
    accept: ['Array.from({ length: m }, () => new Array(n).fill(0))'],
    check: { setup: 'const m = 2, n = 3', expected: [
      [0, 0, 0],
      [0, 0, 0]
    ] },
    explain:
      'The factory function builds a new row for each index. `Array(m).fill(Array(n).fill(0))` looks the same but every row is the same array, so writing to one row changes them all.'
  },
  {
    id: 'ts.fn.fill-shared',
    cat: 'functions',
    kind: 'choice',
    prompt: 'What is `g` at the end?',
    code: `const g = Array(2).fill([])\ng[0].push(1)`,
    options: ['[[1], [1]]', '[[1], []]', '[1, []]', 'TypeError'],
    answer: 0,
    explain: '`fill` puts the same reference in every slot. Use `Array.from({ length: 2 }, () => [])` to get separate arrays.'
  },
  {
    id: 'ts.fn.reduce-sum',
    cat: 'functions',
    kind: 'type',
    prompt: 'Sum the numbers in `nums`.',
    answer: 'nums.reduce((a, b) => a + b, 0)',
    check: [
      { setup: 'const nums = [1, 2, 3, 4]', expected: 10 },
      { setup: 'const nums: number[] = []', expected: 0 }
    ],
    explain:
      'There is no built-in `sum()`, so `reduce` is the one-liner. Always pass the initial `0`: without it, an empty array throws a TypeError. A plain loop (`let s = 0; for (const x of nums) s += x`) is just as good in an interview.'
  },
  {
    id: 'ts.fn.reduce-empty',
    cat: 'functions',
    kind: 'choice',
    prompt: 'What happens?',
    code: `const xs: number[] = []\nxs.reduce((a, b) => a + b)`,
    options: ['TypeError: reduce of empty array with no initial value', '0', 'undefined', 'NaN'],
    answer: 0,
    codeOptions: false,
    explain: 'With no initial value, `reduce` uses the first element as the start, and an empty array has none. Pass `0` as the second argument.'
  },
  {
    id: 'ts.fn.max',
    cat: 'functions',
    kind: 'type',
    prompt: 'Largest value in `nums`.',
    answer: 'Math.max(...nums)',
    check: [
      { setup: 'const nums = [3, 9, -1]', expected: 9 },
      { setup: 'const nums = [-5, -2]', expected: -2 }
    ],
    explain: 'Spreading very large arrays (~100k+ elements) can overflow the call stack. A loop or `reduce` is safe for any size.'
  },
  {
    id: 'ts.fn.max-empty',
    cat: 'functions',
    kind: 'choice',
    prompt: 'What does `Math.max(...[])` return?',
    options: ['-Infinity', '0', 'undefined', 'NaN'],
    answer: 0,
    explain: 'The largest of nothing is `-Infinity`, and `Math.min()` is `Infinity`. Handle empty input explicitly.'
  },
  {
    id: 'ts.fn.flat',
    cat: 'functions',
    kind: 'choice',
    prompt: 'What does this return?',
    code: `[[1, 2], [3, [4]]].flat()`,
    options: ['[1, 2, 3, [4]]', '[1, 2, 3, 4]', '[[1, 2], [3, [4]]]', '[1, 2, [3, [4]]]'],
    answer: 0,
    explain: '`flat()` flattens one level by default. Use `flat(Infinity)` to flatten everything. `flatMap` is `map` followed by `flat(1)`.'
  },
  {
    id: 'ts.fn.every-empty',
    cat: 'functions',
    kind: 'choice',
    prompt: 'What are the two results?',
    code: `[].every(x => x > 0)\n[].some(x => x > 0)`,
    options: ['true and false', 'false and false', 'true and true', 'false and true'],
    answer: 0,
    codeOptions: false,
    explain: '`every` on an empty array is vacuously true and `some` is false. Both stop as soon as the answer is known.'
  },

  // ── Map / Set / Object ──
  {
    id: 'ts.fn.map-count',
    cat: 'functions',
    kind: 'type',
    prompt: 'Increment the count for key `k` in Map `freq`; it may not exist yet.',
    answer: 'freq.set(k, (freq.get(k) ?? 0) + 1)',
    check: [
      { setup: "const freq = new Map([['a', 1]]); const k = 'b'", expected: new Map([['a', 1], ['b', 1]]) },
      { setup: "const freq = new Map([['a', 1]]); const k = 'a'", expected: new Map([['a', 2]]) }
    ],
    explain: '`get` returns `undefined` for a missing key, and `undefined + 1` is NaN. `set` returns the map, so calls can be chained.'
  },
  {
    id: 'ts.fn.map-size',
    cat: 'functions',
    kind: 'choice',
    prompt: 'How many entries are in Map `m`?',
    options: ['m.size', 'm.length', 'm.count()', 'Object.keys(m).length'],
    answer: 0,
    explain: '`Map` and `Set` have `size`, a property, not a method. Use `Object.keys` only on plain objects.'
  },
  {
    id: 'ts.fn.map-order',
    cat: 'functions',
    kind: 'choice',
    prompt: 'In what order does `[...map.keys()]` return keys?',
    options: ['Insertion order', 'Sorted ascending', 'Arbitrary (hash order)', 'Reverse insertion order'],
    answer: 0,
    codeOptions: false,
    explain:
      'Maps and Sets keep insertion order, and setting an existing key doesn\'t move it. That makes a simple LRU cache possible: `delete` then `set` to move a key to the end, and evict `map.keys().next().value`.'
  },
  {
    id: 'ts.fn.object-key-order',
    cat: 'functions',
    kind: 'choice',
    prompt: 'What does this return?',
    code: `Object.keys({ b: 1, 2: 1, a: 1, 1: 1 })`,
    options: ["['1', '2', 'b', 'a']", "['b', '2', 'a', '1']", "['1', '2', 'a', 'b']", "['b', 'a', '1', '2']"],
    answer: 0,
    explain: 'Integer-like keys come first in ascending order, then string keys in insertion order. Keys are always strings. A `Map` avoids both surprises.'
  },
  {
    id: 'ts.fn.set-unique',
    cat: 'functions',
    kind: 'type',
    prompt: 'Unique values of `nums`, as an array.',
    answer: '[...new Set(nums)]',
    accept: ['Array.from(new Set(nums))'],
    check: { setup: 'const nums = [1, 1, 2, 3, 3]', expected: [1, 2, 3] },
    explain:
      'Two steps: `new Set(nums)` drops duplicates but gives a Set, then `[...set]` spreads its items into a new array. Spread works on any iterable: on an array it makes a shallow copy, on a string it gives the characters. A Set keeps the order of first appearance, and `new Set(nums).size !== nums.length` tells you whether there are duplicates.'
  },
  {
    id: 'ts.fn.entries',
    cat: 'functions',
    kind: 'choice',
    prompt: 'What does this return?',
    code: `Object.entries({ a: 1, b: 2 })`,
    options: ["[['a', 1], ['b', 2]]", "{ a: 1, b: 2 }", "['a', 'b']", "[{ a: 1 }, { b: 2 }]"],
    answer: 0,
    explain: '`Object.entries` and `[...map]` both give `[key, value]` tuples. `Object.fromEntries` and `new Map(entries)` turn them back.'
  },

  // ── Math ──
  {
    id: 'ts.fn.mod-negative',
    cat: 'functions',
    kind: 'choice',
    prompt: 'What does `-7 % 3` evaluate to?',
    options: ['-1', '2', '1', '-2'],
    answer: 0,
    explain: '`%` is a remainder and takes the sign of the left side. For a true modulo (e.g. wrapping indexes), use `((x % m) + m) % m`.'
  },
  {
    id: 'ts.fn.floor-trunc',
    cat: 'functions',
    kind: 'choice',
    prompt: 'What are `Math.floor(-3.5)` and `Math.trunc(-3.5)`?',
    options: ['-4 and -3', '-3 and -4', '-4 and -4', '-3 and -3'],
    answer: 0,
    codeOptions: false,
    explain: '`floor` rounds down and `trunc` drops the fraction, rounding toward zero. They only differ for negative numbers.'
  }
]
