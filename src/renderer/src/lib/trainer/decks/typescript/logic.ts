import type { Card } from '../../types'

export const logic: Card[] = [
  // ── Binary search ──
  {
    id: 'ts.logic.mid',
    cat: 'logic',
    kind: 'type',
    prompt: 'Integer midpoint of `lo` and `hi`.',
    answer: '(lo + hi) >> 1',
    check: [
      { setup: 'const lo = 3, hi = 8', expected: 5 },
      { setup: 'const lo = 0, hi = 1', expected: 0 },
      { setup: 'const lo = 10, hi = 10', expected: 10 }
    ],
    explain:
      '`Math.floor((lo + hi) / 2)` works too. `>> 1` is a 32-bit operation, which is fine for array indexes. JS numbers don\'t overflow at 2³¹, but `lo + ((hi - lo) >> 1)` is the habit interviewers know from other languages.'
  },
  {
    id: 'ts.logic.bs-inclusive',
    cat: 'logic',
    kind: 'choice',
    prompt: 'With `lo = 0, hi = n - 1` (both inclusive), which loop condition finds an exact match?',
    options: ['while (lo <= hi)', 'while (lo < hi)', 'while (lo < hi - 1)', 'while (hi - lo > 1)'],
    answer: 0,
    explain: 'With inclusive bounds, a range of one element (`lo === hi`) still needs checking. Move with `lo = mid + 1` and `hi = mid - 1`.'
  },
  {
    id: 'ts.logic.bs-lower-bound',
    cat: 'logic',
    kind: 'choice',
    prompt: 'Finding the first index where `nums[i] >= target`, with `lo = 0, hi = n`. What goes in the else branch?',
    code: `while (lo < hi) {\n  const mid = (lo + hi) >> 1\n  if (nums[mid] < target) lo = mid + 1\n  else ___\n}\nreturn lo`,
    options: ['hi = mid', 'hi = mid - 1', 'lo = mid', 'return mid'],
    answer: 0,
    explain: '`mid` could be the answer, so keep it with `hi = mid`. With half-open bounds, `while (lo < hi)` ends with `lo === hi`, which is the answer (it may be `n`).'
  },

  // ── Two pointers / windows ──
  {
    id: 'ts.logic.two-pointer',
    cat: 'logic',
    kind: 'choice',
    prompt: 'Sorted array, looking for a pair that sums to `target`. `nums[i] + nums[j] < target`. What next?',
    options: ['i++', 'j--', 'i++ and j--', 'Restart with j = n - 1'],
    answer: 0,
    codeOptions: false,
    explain: 'The sum is too small, so move the left pointer to a bigger number. Each step rules out one element, so the whole search is O(n).'
  },
  {
    id: 'ts.logic.window-length',
    cat: 'logic',
    kind: 'type',
    prompt: 'Length of the inclusive window `[left, right]`.',
    answer: 'right - left + 1',
    check: [
      { setup: 'const left = 2, right = 5', expected: 4 },
      { setup: 'const left = 3, right = 3', expected: 1 }
    ],
    explain: 'Inclusive bounds need the `+ 1`. For a half-open window `[left, right)` the length is just `right - left`.'
  },
  {
    id: 'ts.logic.window-shrink',
    cat: 'logic',
    kind: 'choice',
    prompt: 'Sliding window for "longest substring without repeats". Adding `s[right]` creates a duplicate. What do you do?',
    options: [
      'Move left forward until the duplicate is gone',
      'Reset left to right',
      'Move right back by one',
      'Clear the window and start over'
    ],
    answer: 0,
    codeOptions: false,
    explain:
      'Shrink from the left until the window is valid again. Jumping `left` straight to `last.get(c) + 1` (if that is ahead of `left`) skips the loop. Each pointer only moves forward, so it is O(n).'
  },
  {
    id: 'ts.logic.prefix-sum',
    cat: 'logic',
    kind: 'type',
    prompt: '`prefix[i]` is the sum of `nums[0..i-1]` (`prefix[0] = 0`). Write the sum of `nums[l..r]`, inclusive.',
    answer: 'prefix[r + 1] - prefix[l]',
    check: [
      { setup: 'const prefix = [0, 2, 6, 12, 20]; const l = 1, r = 2', expected: 10 },
      { setup: 'const prefix = [0, 2, 6, 12, 20]; const l = 0, r = 3', expected: 20 }
    ],
    explain: 'The extra leading 0 removes edge cases at `l = 0`. Combined with a Map of seen sums, this solves "subarray sum equals k" in O(n).'
  },

  // ── Stacks and queues ──
  {
    id: 'ts.logic.shift-cost',
    cat: 'logic',
    kind: 'choice',
    prompt: 'Your BFS uses `queue.shift()` on 10⁵ nodes and times out. Why, and what is the fix?',
    options: [
      'shift() is O(n); read with a head index instead: queue[head++]',
      'push() is O(n); preallocate the array',
      'BFS needs recursion to be fast',
      'Arrays are slow; use a Set as the queue'
    ],
    answer: 0,
    codeOptions: false,
    explain:
      '`shift` moves every remaining element. Keep `let head = 0` and `while (head < queue.length) { const x = queue[head++] … }`. Or process level by level: `for (const x of level) next.push(…)`.'
  },
  {
    id: 'ts.logic.heap',
    cat: 'logic',
    kind: 'choice',
    prompt: 'Which priority queue is built into JavaScript/TypeScript?',
    options: ['None: write a heap, or explain one', 'PriorityQueue', 'Heap', 'Array.prototype.heapify'],
    answer: 0,
    codeOptions: false,
    explain:
      'There is no built-in heap. LeetCode\'s JS/TS environment preloads `@datastructures-js/priority-queue` (`MinPriorityQueue`, `MaxPriorityQueue`). In interviews, be ready to write a small binary heap, or use sorting or bucket tricks when k is small.'
  },
  {
    id: 'ts.logic.parens',
    cat: 'logic',
    kind: 'choice',
    prompt: 'Validating brackets with a stack: every closing bracket matched its opener. When is the string valid?',
    options: ['Only if the stack is empty at the end', 'Always', 'If the stack has an even size', 'If the last character was a closing bracket'],
    answer: 0,
    codeOptions: false,
    explain: 'Leftover openers like `"(("` mean the string is invalid. Also fail early when you see a closer and the stack is empty.'
  },
  {
    id: 'ts.logic.monotonic',
    cat: 'logic',
    kind: 'choice',
    prompt: 'For "next warmer day" (Daily Temperatures), what does the monotonic stack hold?',
    options: [
      'Indices whose temperatures decrease from bottom to top',
      'Temperatures in increasing order',
      'Every index seen so far',
      'The answer array in reverse'
    ],
    answer: 0,
    codeOptions: false,
    explain: 'While today is warmer than the day on top of the stack, pop it and record `i - j`. Store indices, not values, so you can compute distances. Each index is pushed and popped once, so it is O(n).'
  },
  {
    id: 'ts.logic.visited',
    cat: 'logic',
    kind: 'choice',
    prompt: 'In BFS, when should you mark a node as visited?',
    options: ['When you push it onto the queue', 'When you pop it off the queue', 'After the whole level is done', 'Only at the target'],
    answer: 0,
    codeOptions: false,
    explain: 'If you mark on pop, the same node can be queued many times before it is processed. Mark on push so each node enters the queue once.'
  },

  // ── Complexity and numbers ──
  {
    id: 'ts.logic.includes-loop',
    cat: 'logic',
    kind: 'choice',
    prompt: 'What is the time complexity, and how do you fix it?',
    code: `for (const x of a) if (b.includes(x)) out.push(x)`,
    options: ['O(n·m); put b in a Set first', 'O(n); already optimal', 'O(n log m); sort b first', 'O(n + m); includes is hashed'],
    answer: 0,
    codeOptions: false,
    explain: '`includes` scans the whole array each time. `const set = new Set(b)` makes each lookup O(1), so the total is O(n + m).'
  },
  {
    id: 'ts.logic.sort-cost',
    cat: 'logic',
    kind: 'choice',
    prompt: 'What is the time complexity of `nums.sort((a, b) => a - b)`?',
    options: ['O(n log n)', 'O(n)', 'O(n²)', 'O(log n)'],
    answer: 0,
    explain: 'V8 uses TimSort: O(n log n), and stable. If the input is already sorted, look for a two-pointer or binary-search solution instead.'
  },
  {
    id: 'ts.logic.min-init',
    cat: 'logic',
    kind: 'type',
    prompt: 'Starting value for a running minimum.',
    answer: 'Infinity',
    accept: ['Number.POSITIVE_INFINITY', 'Number.MAX_SAFE_INTEGER', 'Number.MAX_VALUE'],
    explain: 'Any real value beats `Infinity` in `Math.min`. Use `-Infinity` for a running maximum. In DP, `Infinity + 1` is still `Infinity`, which is handy.'
  },
  {
    id: 'ts.logic.safe-int',
    cat: 'logic',
    kind: 'choice',
    prompt: 'Above what value do integers lose precision?',
    options: ['2⁵³ − 1 (Number.MAX_SAFE_INTEGER)', '2³¹ − 1', '2⁶⁴ − 1', 'There is no limit'],
    answer: 0,
    codeOptions: false,
    explain: 'Numbers are doubles. For big products or factorials, use `BigInt` (`10n ** 20n`). If a problem asks for an answer "modulo 1e9+7", take the modulo at every step.'
  },
  {
    id: 'ts.logic.bitwise-32',
    cat: 'logic',
    kind: 'choice',
    prompt: 'What does `(2 ** 31) | 0` evaluate to?',
    options: ['-2147483648', '2147483648', '0', 'Infinity'],
    answer: 0,
    explain: 'Bitwise operators work on signed 32-bit integers, so large numbers wrap around. Use `>>> 0` to read the result as unsigned.'
  },
  {
    id: 'ts.logic.power-of-two',
    cat: 'logic',
    kind: 'type',
    prompt: 'Is positive integer `n` a power of two? (boolean expression)',
    answer: '(n & (n - 1)) === 0',
    check: [
      { setup: 'const n = 64', expected: true },
      { setup: 'const n = 48', expected: false },
      { setup: 'const n = 1', expected: true }
    ],
    explain: '`n & (n - 1)` clears the lowest set bit, and a power of two has only one. Remember the parentheses: `===` binds tighter than `&`.'
  },
  {
    id: 'ts.logic.xor',
    cat: 'logic',
    kind: 'choice',
    prompt: 'What does this return?',
    code: `[4, 1, 2, 1, 2].reduce((a, b) => a ^ b)`,
    options: ['4', '0', '10', '1'],
    answer: 0,
    explain: '`x ^ x = 0` and `x ^ 0 = x`, so pairs cancel out and the unpaired value is left. This is "Single Number" in O(1) extra space.'
  },

  // ── DP / recursion / patterns ──
  {
    id: 'ts.logic.stairs',
    cat: 'logic',
    kind: 'type',
    prompt: 'Climbing stairs (steps of 1 or 2). Fill in the recurrence: `dp[i] = …`',
    answer: 'dp[i - 1] + dp[i - 2]',
    check: [
      { setup: 'const dp = [1, 1, 2, 3]; const i = 4', expected: 5 },
      { setup: 'const dp = [1, 1, 2, 3, 5, 8]; const i = 6', expected: 13 }
    ],
    explain: 'The last step was either 1 or 2. You only need the previous two values, so two variables give O(1) space.'
  },
  {
    id: 'ts.logic.kadane',
    cat: 'logic',
    kind: 'type',
    prompt: "Kadane's step: best sum of a subarray ending at `x`, given `cur` for the previous element.",
    answer: 'Math.max(x, cur + x)',
    check: [
      { setup: 'const cur = -3, x = 2', expected: 2 },
      { setup: 'const cur = 4, x = -1', expected: 3 }
    ],
    explain: 'Either extend the previous subarray or start a new one at `x`. Track the best value separately, and start it at `-Infinity` so all-negative inputs work.'
  },
  {
    id: 'ts.logic.cycle',
    cat: 'logic',
    kind: 'choice',
    prompt: 'How do you detect a cycle in a linked list with O(1) extra space?',
    options: ['Slow and fast pointers: they meet if there is a cycle', 'Store visited nodes in a Set', 'Reverse the list and compare', 'Count nodes until you pass 10⁴'],
    answer: 0,
    codeOptions: false,
    explain: 'Floyd\'s algorithm moves `slow` by 1 and `fast` by 2. A Set also works but uses O(n) space. Loop `while (fast && fast.next)`.'
  },
  {
    id: 'ts.logic.intervals',
    cat: 'logic',
    kind: 'choice',
    prompt: 'What is the first step in Merge Intervals?',
    options: ['Sort by start', 'Sort by end', 'Sort by length', 'Build a Map of starts'],
    answer: 0,
    codeOptions: false,
    explain: 'After sorting by start, overlaps are adjacent. If `start <= last[1]`, extend `last[1] = Math.max(last[1], end)`.'
  },
  {
    id: 'ts.logic.recursion-depth',
    cat: 'logic',
    kind: 'choice',
    prompt: 'A recursive DFS on a 10⁵-node path graph crashes. Why?',
    options: [
      'The call stack overflows (V8 allows roughly 10k frames)',
      'Recursion is O(n²) in JS',
      'Closures leak memory',
      'TypeScript forbids deep recursion'
    ],
    answer: 0,
    codeOptions: false,
    explain: 'Deep recursion throws `RangeError: Maximum call stack size exceeded`. For inputs that can be very deep, switch to an explicit stack array.'
  },
  {
    id: 'ts.logic.dirs',
    cat: 'logic',
    kind: 'choice',
    prompt: 'Which `dirs` array visits the 4 grid neighbours?',
    options: [
      '[[1, 0], [-1, 0], [0, 1], [0, -1]]',
      '[[1, 1], [-1, -1], [1, -1], [-1, 1]]',
      '[[0, 0], [1, 0], [0, 1], [1, 1]]',
      '[1, -1, 1, -1]'
    ],
    answer: 0,
    explain:
      'Loop `for (const [dr, dc] of dirs)` and bounds-check `r + dr`, `c + dc`. The diagonal list visits the other 4 of the 8 surrounding cells.'
  }
]
