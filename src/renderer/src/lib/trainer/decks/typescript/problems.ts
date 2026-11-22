import type { Card } from '../../types'

// Each template has exactly one `___`. Graded by running the tests, so any correct fill passes.
export const problems: Card[] = [
  {
    id: 'ts.prob.two-sum',
    cat: 'problems',
    kind: 'blank',
    title: 'Two Sum',
    slug: 'two-sum',
    prompt: 'Return the indices of the two numbers that add up to `target`.',
    template: `function twoSum(nums: number[], target: number): number[] {
  const seen = new Map<number, number>() // value -> index
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i]
    ___
    seen.set(nums[i], i)
  }
  return []
}`,
    answer: 'if (seen.has(need)) return [seen.get(need)!, i]',
    fn: 'twoSum',
    tests: [
      { args: [[2, 7, 11, 15], 9], expected: [0, 1] },
      { args: [[3, 2, 4], 6], expected: [1, 2] },
      { args: [[3, 3], 6], expected: [0, 1] }
    ],
    explain: 'Check for the complement before inserting the current value, so an element is never paired with itself. One pass, O(n).'
  },
  {
    id: 'ts.prob.valid-anagram',
    cat: 'problems',
    kind: 'blank',
    title: 'Valid Anagram',
    slug: 'valid-anagram',
    prompt: 'Is `t` an anagram of `s`?',
    template: `function isAnagram(s: string, t: string): boolean {
  if (s.length !== t.length) return false
  const count = new Map<string, number>()
  for (const c of s) count.set(c, (count.get(c) ?? 0) + 1)
  for (const c of t) {
    const n = count.get(c) ?? 0
    if (n === 0) return false
    ___
  }
  return true
}`,
    answer: 'count.set(c, n - 1)',
    fn: 'isAnagram',
    tests: [
      { args: ['anagram', 'nagaram'], expected: true },
      { args: ['rat', 'car'], expected: false },
      { args: ['aacc', 'ccac'], expected: false }
    ],
    explain: 'Count up for `s`, count down for `t`. Since the lengths match, never going below zero means every count ends at exactly zero.'
  },
  {
    id: 'ts.prob.contains-duplicate',
    cat: 'problems',
    kind: 'blank',
    title: 'Contains Duplicate',
    slug: 'contains-duplicate',
    prompt: 'Does any value appear at least twice?',
    template: `function containsDuplicate(nums: number[]): boolean {
  const seen = new Set<number>()
  for (const x of nums) {
    ___
    seen.add(x)
  }
  return false
}`,
    answer: 'if (seen.has(x)) return true',
    fn: 'containsDuplicate',
    tests: [
      { args: [[1, 2, 3, 1]], expected: true },
      { args: [[1, 2, 3, 4]], expected: false },
      { args: [[]], expected: false }
    ],
    explain: 'Stop at the first value you have already seen. As a one-liner: `new Set(nums).size !== nums.length`.'
  },
  {
    id: 'ts.prob.valid-palindrome',
    cat: 'problems',
    kind: 'blank',
    title: 'Valid Palindrome',
    slug: 'valid-palindrome',
    prompt: 'Ignoring case and non-alphanumerics, is `s` a palindrome?',
    template: `function isPalindrome(s: string): boolean {
  const t = ___
  let i = 0, j = t.length - 1
  while (i < j) if (t[i++] !== t[j--]) return false
  return true
}`,
    answer: "s.toLowerCase().replace(/[^a-z0-9]/g, '')",
    fn: 'isPalindrome',
    tests: [
      { args: ['A man, a plan, a canal: Panama'], expected: true },
      { args: ['race a car'], expected: false },
      { args: [' '], expected: true },
      { args: ['0P'], expected: false }
    ],
    explain: 'Clean the string first, then compare from both ends. To use O(1) space, skip non-alphanumerics with two pointers on the original string.'
  },
  {
    id: 'ts.prob.valid-parentheses',
    cat: 'problems',
    kind: 'blank',
    title: 'Valid Parentheses',
    slug: 'valid-parentheses',
    prompt: 'Are the brackets in `s` balanced and properly nested?',
    template: `function isValid(s: string): boolean {
  const open: Record<string, string> = { ')': '(', ']': '[', '}': '{' }
  const stack: string[] = []
  for (const c of s) {
    if (c in open) {
      ___
    } else stack.push(c)
  }
  return stack.length === 0
}`,
    answer: 'if (stack.pop() !== open[c]) return false',
    fn: 'isValid',
    tests: [
      { args: ['()[]{}'], expected: true },
      { args: ['(]'], expected: false },
      { args: ['([)]'], expected: false },
      { args: ['{[]}'], expected: true },
      { args: [']'], expected: false }
    ],
    explain: '`pop()` on an empty stack returns `undefined`, which never equals an opener, so a stray closer fails too.'
  },
  {
    id: 'ts.prob.best-time-stock',
    cat: 'problems',
    kind: 'blank',
    title: 'Best Time to Buy and Sell Stock',
    slug: 'best-time-to-buy-and-sell-stock',
    prompt: 'Maximum profit from one buy followed by one sell.',
    template: `function maxProfit(prices: number[]): number {
  let min = Infinity, best = 0
  for (const p of prices) {
    min = Math.min(min, p)
    ___
  }
  return best
}`,
    answer: 'best = Math.max(best, p - min)',
    fn: 'maxProfit',
    tests: [
      { args: [[7, 1, 5, 3, 6, 4]], expected: 5 },
      { args: [[7, 6, 4, 3, 1]], expected: 0 },
      { args: [[2, 4, 1]], expected: 2 }
    ],
    explain: 'Track the cheapest price so far. Selling today makes `p - min`. Starting `best` at 0 covers the case where you never trade.'
  },
  {
    id: 'ts.prob.binary-search',
    cat: 'problems',
    kind: 'blank',
    title: 'Binary Search',
    slug: 'binary-search',
    prompt: 'Return the index of `target` in sorted `nums`, or -1.',
    template: `function search(nums: number[], target: number): number {
  let lo = 0, hi = nums.length - 1
  while (___) {
    const mid = (lo + hi) >> 1
    if (nums[mid] === target) return mid
    if (nums[mid] < target) lo = mid + 1
    else hi = mid - 1
  }
  return -1
}`,
    answer: 'lo <= hi',
    fn: 'search',
    tests: [
      { args: [[-1, 0, 3, 5, 9, 12], 9], expected: 4 },
      { args: [[-1, 0, 3, 5, 9, 12], 2], expected: -1 },
      { args: [[5], 5], expected: 0 },
      { args: [[2, 5], 5], expected: 1 }
    ],
    explain: 'Both bounds are inclusive, so a one-element range (`lo === hi`) still needs checking. `lo < hi` misses `[5]` with target 5.'
  },
  {
    id: 'ts.prob.max-subarray',
    cat: 'problems',
    kind: 'blank',
    title: 'Maximum Subarray',
    slug: 'maximum-subarray',
    prompt: 'Largest sum of a non-empty contiguous subarray.',
    template: `function maxSubArray(nums: number[]): number {
  let cur = 0, best = -Infinity
  for (const x of nums) {
    ___
    best = Math.max(best, cur)
  }
  return best
}`,
    answer: 'cur = Math.max(x, cur + x)',
    fn: 'maxSubArray',
    tests: [
      { args: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]], expected: 6 },
      { args: [[1]], expected: 1 },
      { args: [[-3, -1, -2]], expected: -1 },
      { args: [[5, 4, -1, 7, 8]], expected: 23 }
    ],
    explain: 'Kadane: either extend the current subarray or start fresh at `x`. Starting `best` at `-Infinity` handles all-negative input.'
  },
  {
    id: 'ts.prob.climbing-stairs',
    cat: 'problems',
    kind: 'blank',
    title: 'Climbing Stairs',
    slug: 'climbing-stairs',
    prompt: 'Number of ways to climb `n` steps taking 1 or 2 at a time.',
    template: `function climbStairs(n: number): number {
  let a = 1, b = 1 // ways to reach step i-2, i-1
  for (let i = 2; i <= n; i++) {
    ___
  }
  return b
}`,
    answer: '[a, b] = [b, a + b]',
    fn: 'climbStairs',
    tests: [
      { args: [1], expected: 1 },
      { args: [2], expected: 2 },
      { args: [3], expected: 3 },
      { args: [5], expected: 8 },
      { args: [10], expected: 89 }
    ],
    explain: 'This is Fibonacci. The destructuring swap moves both values forward at once, without a temp variable.'
  },
  {
    id: 'ts.prob.group-anagrams',
    cat: 'problems',
    kind: 'blank',
    title: 'Group Anagrams',
    slug: 'group-anagrams',
    prompt: 'Group the strings that are anagrams of each other.',
    template: `function groupAnagrams(strs: string[]): string[][] {
  const groups = new Map<string, string[]>()
  for (const s of strs) {
    const key = ___
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(s)
  }
  return [...groups.values()]
}`,
    answer: "[...s].sort().join('')",
    fn: 'groupAnagrams',
    unordered: true,
    tests: [
      {
        args: [['eat', 'tea', 'tan', 'ate', 'nat', 'bat']],
        expected: [['bat'], ['nat', 'tan'], ['ate', 'eat', 'tea']]
      },
      { args: [['']], expected: [['']] },
      { args: [['a']], expected: [['a']] }
    ],
    explain: 'Anagrams have the same sorted letters. Sorting costs O(k log k) per word. A 26-slot count array joined with `#` is O(k).'
  },
  {
    id: 'ts.prob.top-k-frequent',
    cat: 'problems',
    kind: 'blank',
    title: 'Top K Frequent Elements',
    slug: 'top-k-frequent-elements',
    prompt: 'Return the `k` most frequent values.',
    template: `function topKFrequent(nums: number[], k: number): number[] {
  const freq = new Map<number, number>()
  for (const x of nums) freq.set(x, (freq.get(x) ?? 0) + 1)
  return [...freq]
    ___
    .slice(0, k)
    .map(([x]) => x)
}`,
    answer: '.sort((a, b) => b[1] - a[1])',
    fn: 'topKFrequent',
    unordered: true,
    tests: [
      { args: [[1, 1, 1, 2, 2, 3], 2], expected: [1, 2] },
      { args: [[1], 1], expected: [1] },
      { args: [[4, 4, 5, 5, 5, 6, 7, 7, 7, 7], 2], expected: [7, 5] }
    ],
    explain: 'Sort the `[value, count]` entries by count, descending: O(n log n). Bucket sort by count (an array of lists indexed by frequency) gets O(n).'
  },
  {
    id: 'ts.prob.product-except-self',
    cat: 'problems',
    kind: 'blank',
    title: 'Product of Array Except Self',
    slug: 'product-of-array-except-self',
    prompt: '`out[i]` is the product of every element except `nums[i]`, without division.',
    template: `function productExceptSelf(nums: number[]): number[] {
  const n = nums.length
  const out = new Array<number>(n).fill(1)
  let left = 1
  for (let i = 0; i < n; i++) {
    out[i] = left
    left *= nums[i]
  }
  let right = 1
  for (let i = n - 1; i >= 0; i--) {
    ___
  }
  return out
}`,
    answer: 'out[i] *= right\n    right *= nums[i]',
    fn: 'productExceptSelf',
    tests: [
      { args: [[1, 2, 3, 4]], expected: [24, 12, 8, 6] },
      { args: [[-1, 1, 0, -3, 3]], expected: [0, 0, 9, 0, 0] }
    ],
    explain: 'The first pass stores the product of everything to the left. The second multiplies in everything to the right. Update `out[i]` before `right`, so it doesn\'t include `nums[i]`.'
  },
  {
    id: 'ts.prob.longest-substring',
    cat: 'problems',
    kind: 'blank',
    title: 'Longest Substring Without Repeating Characters',
    slug: 'longest-substring-without-repeating-characters',
    prompt: 'Length of the longest substring with no repeated characters.',
    template: `function lengthOfLongestSubstring(s: string): number {
  const last = new Map<string, number>() // char -> last index seen
  let left = 0, best = 0
  for (let right = 0; right < s.length; right++) {
    const c = s[right]
    if (last.has(c) && last.get(c)! >= left) ___
    last.set(c, right)
    best = Math.max(best, right - left + 1)
  }
  return best
}`,
    answer: 'left = last.get(c)! + 1',
    fn: 'lengthOfLongestSubstring',
    tests: [
      { args: ['abcabcbb'], expected: 3 },
      { args: ['bbbbb'], expected: 1 },
      { args: ['pwwkew'], expected: 3 },
      { args: ['abba'], expected: 2 },
      { args: [''], expected: 0 }
    ],
    explain: 'Jump `left` just past the previous occurrence. The `>= left` check ignores occurrences already outside the window ("abba").'
  },
  {
    id: 'ts.prob.container-water',
    cat: 'problems',
    kind: 'blank',
    title: 'Container With Most Water',
    slug: 'container-with-most-water',
    prompt: 'Maximum water held between two of the lines.',
    template: `function maxArea(height: number[]): number {
  let i = 0, j = height.length - 1, best = 0
  while (i < j) {
    best = Math.max(best, Math.min(height[i], height[j]) * (j - i))
    ___
  }
  return best
}`,
    answer: 'if (height[i] < height[j]) i++\n    else j--',
    fn: 'maxArea',
    tests: [
      { args: [[1, 8, 6, 2, 5, 4, 8, 3, 7]], expected: 49 },
      { args: [[1, 1]], expected: 1 },
      { args: [[4, 3, 2, 1, 4]], expected: 16 }
    ],
    explain: 'Move the shorter line inward. Keeping it can never give more water, because the width only shrinks.'
  },
  {
    id: 'ts.prob.number-of-islands',
    cat: 'problems',
    kind: 'blank',
    title: 'Number of Islands',
    slug: 'number-of-islands',
    prompt: "Count connected groups of '1's (4-directional).",
    template: `function numIslands(grid: string[][]): number {
  const m = grid.length, n = grid[0].length
  const sink = (r: number, c: number): void => {
    ___
    grid[r][c] = '0'
    sink(r + 1, c); sink(r - 1, c); sink(r, c + 1); sink(r, c - 1)
  }
  let count = 0
  for (let r = 0; r < m; r++)
    for (let c = 0; c < n; c++)
      if (grid[r][c] === '1') { count++; sink(r, c) }
  return count
}`,
    answer: "if (r < 0 || c < 0 || r >= m || c >= n || grid[r][c] !== '1') return",
    fn: 'numIslands',
    tests: [
      {
        args: [
          [
            ['1', '1', '1', '1', '0'],
            ['1', '1', '0', '1', '0'],
            ['1', '1', '0', '0', '0'],
            ['0', '0', '0', '0', '0']
          ]
        ],
        expected: 1
      },
      {
        args: [
          [
            ['1', '1', '0', '0', '0'],
            ['1', '1', '0', '0', '0'],
            ['0', '0', '1', '0', '0'],
            ['0', '0', '0', '1', '1']
          ]
        ],
        expected: 3
      }
    ],
    explain: 'The base case comes first: out of bounds, water, or already sunk. Overwriting the cell with \'0\' marks it visited without a separate Set.'
  },
  {
    id: 'ts.prob.three-sum',
    cat: 'problems',
    kind: 'blank',
    title: '3Sum',
    slug: '3sum',
    prompt: 'All unique triplets that sum to 0.',
    template: `function threeSum(nums: number[]): number[][] {
  nums.sort((a, b) => a - b)
  const out: number[][] = []
  for (let i = 0; i < nums.length - 2; i++) {
    if (i > 0 && nums[i] === nums[i - 1]) continue
    let lo = i + 1, hi = nums.length - 1
    while (lo < hi) {
      const sum = nums[i] + nums[lo] + nums[hi]
      if (sum < 0) lo++
      else if (sum > 0) hi--
      else {
        out.push([nums[i], nums[lo], nums[hi]])
        ___
      }
    }
  }
  return out
}`,
    answer: 'lo++\n        hi--\n        while (lo < hi && nums[lo] === nums[lo - 1]) lo++',
    fn: 'threeSum',
    unordered: true,
    tests: [
      { args: [[-1, 0, 1, 2, -1, -4]], expected: [[-1, -1, 2], [-1, 0, 1]] },
      { args: [[0, 1, 1]], expected: [] },
      { args: [[0, 0, 0, 0]], expected: [[0, 0, 0]] },
      { args: [[-2, 0, 0, 2, 2]], expected: [[-2, 0, 2]] }
    ],
    explain: 'After a match, move both pointers, then skip repeated values of `nums[lo]` so the same triplet isn\'t added twice. Without the skip, `[-2, 0, 0, 2, 2]` adds `[-2, 0, 2]` twice.'
  },
  {
    id: 'ts.prob.merge-intervals',
    cat: 'problems',
    kind: 'blank',
    title: 'Merge Intervals',
    slug: 'merge-intervals',
    prompt: 'Merge all overlapping intervals.',
    template: `function merge(intervals: number[][]): number[][] {
  intervals.sort((a, b) => a[0] - b[0])
  const out: number[][] = []
  for (const [s, e] of intervals) {
    const last = out[out.length - 1]
    if (last && s <= last[1]) ___
    else out.push([s, e])
  }
  return out
}`,
    answer: 'last[1] = Math.max(last[1], e)',
    fn: 'merge',
    tests: [
      { args: [[[1, 3], [2, 6], [8, 10], [15, 18]]], expected: [[1, 6], [8, 10], [15, 18]] },
      { args: [[[1, 4], [4, 5]]], expected: [[1, 5]] },
      { args: [[[1, 4], [2, 3]]], expected: [[1, 4]] }
    ],
    explain: 'Take the max of the ends, not just `e`. An interval contained in the previous one (`[2, 3]` inside `[1, 4]`) must not shrink it.'
  },
  {
    id: 'ts.prob.daily-temperatures',
    cat: 'problems',
    kind: 'blank',
    title: 'Daily Temperatures',
    slug: 'daily-temperatures',
    prompt: 'For each day, how many days until a warmer one (0 if none)?',
    template: `function dailyTemperatures(temps: number[]): number[] {
  const out = new Array<number>(temps.length).fill(0)
  const stack: number[] = [] // indices, temps decreasing
  for (let i = 0; i < temps.length; i++) {
    while (stack.length && temps[stack[stack.length - 1]] < temps[i]) {
      ___
    }
    stack.push(i)
  }
  return out
}`,
    answer: 'const j = stack.pop()!\n      out[j] = i - j',
    fn: 'dailyTemperatures',
    tests: [
      { args: [[73, 74, 75, 71, 69, 72, 76, 73]], expected: [1, 1, 4, 2, 1, 1, 0, 0] },
      { args: [[30, 40, 50, 60]], expected: [1, 1, 1, 0] },
      { args: [[30, 60, 90]], expected: [1, 1, 0] }
    ],
    explain: 'Today is the warmer day for every colder index on top of the stack. Each index is pushed and popped once, so it is O(n).'
  },
  {
    id: 'ts.prob.coin-change',
    cat: 'problems',
    kind: 'blank',
    title: 'Coin Change',
    slug: 'coin-change',
    prompt: 'Fewest coins that make `amount`, or -1.',
    template: `function coinChange(coins: number[], amount: number): number {
  const dp = new Array<number>(amount + 1).fill(Infinity)
  dp[0] = 0
  for (let a = 1; a <= amount; a++)
    for (const c of coins)
      if (c <= a) ___
  return dp[amount] === Infinity ? -1 : dp[amount]
}`,
    answer: 'dp[a] = Math.min(dp[a], dp[a - c] + 1)',
    fn: 'coinChange',
    tests: [
      { args: [[1, 2, 5], 11], expected: 3 },
      { args: [[2], 3], expected: -1 },
      { args: [[1], 0], expected: 0 },
      { args: [[186, 419, 83, 408], 6249], expected: 20 }
    ],
    explain: '`dp[a]` is the fewest coins for amount `a`. Try each coin as the last one used. Unreachable amounts stay at `Infinity`, and `Infinity + 1` is still `Infinity`.'
  }
]
