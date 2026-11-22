import type { Difficulty, ProblemSummary } from '@shared/types'

// Curated study lists. Problems are referenced by slug and resolved against the live problem set,
// so titles, difficulty and solved status always come from LeetCode.

export interface StudySection {
  name: string
  slugs: string[]
}

export interface StudyList {
  id: string
  name: string
  short: string
  author: string
  url: string
  description: string
  sections: StudySection[]
}

const s = (name: string, slugs: string): StudySection => ({ name, slugs: slugs.trim().split(/\s+/) })

export const STUDY_LISTS: StudyList[] = [
  {
    id: 'neetcode150',
    name: 'NeetCode 150',
    short: 'NC',
    author: 'NeetCode',
    url: 'https://neetcode.io/practice',
    description: 'Blind 75 expanded to 150 problems, ordered as a roadmap from arrays to dynamic programming.',
    sections: [
      s('Arrays & Hashing', `contains-duplicate valid-anagram two-sum group-anagrams top-k-frequent-elements
        encode-and-decode-strings product-of-array-except-self valid-sudoku longest-consecutive-sequence`),
      s('Two Pointers', `valid-palindrome two-sum-ii-input-array-is-sorted 3sum container-with-most-water trapping-rain-water`),
      s('Sliding Window', `best-time-to-buy-and-sell-stock longest-substring-without-repeating-characters
        longest-repeating-character-replacement permutation-in-string minimum-window-substring sliding-window-maximum`),
      s('Stack', `valid-parentheses min-stack evaluate-reverse-polish-notation generate-parentheses daily-temperatures
        car-fleet largest-rectangle-in-histogram`),
      s('Binary Search', `binary-search search-a-2d-matrix koko-eating-bananas find-minimum-in-rotated-sorted-array
        search-in-rotated-sorted-array time-based-key-value-store median-of-two-sorted-arrays`),
      s('Linked List', `reverse-linked-list merge-two-sorted-lists linked-list-cycle reorder-list
        remove-nth-node-from-end-of-list copy-list-with-random-pointer add-two-numbers find-the-duplicate-number
        lru-cache merge-k-sorted-lists reverse-nodes-in-k-group`),
      s('Trees', `invert-binary-tree maximum-depth-of-binary-tree diameter-of-binary-tree balanced-binary-tree same-tree
        subtree-of-another-tree lowest-common-ancestor-of-a-binary-search-tree binary-tree-level-order-traversal
        binary-tree-right-side-view count-good-nodes-in-binary-tree validate-binary-search-tree
        kth-smallest-element-in-a-bst construct-binary-tree-from-preorder-and-inorder-traversal
        binary-tree-maximum-path-sum serialize-and-deserialize-binary-tree`),
      s('Tries', `implement-trie-prefix-tree design-add-and-search-words-data-structure word-search-ii`),
      s('Heap / Priority Queue', `kth-largest-element-in-a-stream last-stone-weight k-closest-points-to-origin
        kth-largest-element-in-an-array task-scheduler design-twitter find-median-from-data-stream`),
      s('Backtracking', `subsets combination-sum combination-sum-ii permutations subsets-ii word-search
        palindrome-partitioning letter-combinations-of-a-phone-number n-queens`),
      s('Graphs', `number-of-islands max-area-of-island clone-graph walls-and-gates rotting-oranges
        pacific-atlantic-water-flow surrounded-regions course-schedule course-schedule-ii graph-valid-tree
        number-of-connected-components-in-an-undirected-graph redundant-connection word-ladder`),
      s('Advanced Graphs', `reconstruct-itinerary min-cost-to-connect-all-points network-delay-time swim-in-rising-water
        alien-dictionary cheapest-flights-within-k-stops`),
      s('1-D Dynamic Programming', `climbing-stairs min-cost-climbing-stairs house-robber house-robber-ii
        longest-palindromic-substring palindromic-substrings decode-ways coin-change maximum-product-subarray
        word-break longest-increasing-subsequence partition-equal-subset-sum`),
      s('2-D Dynamic Programming', `unique-paths longest-common-subsequence best-time-to-buy-and-sell-stock-with-cooldown
        coin-change-ii target-sum interleaving-string longest-increasing-path-in-a-matrix distinct-subsequences
        edit-distance burst-balloons regular-expression-matching`),
      s('Greedy', `maximum-subarray jump-game jump-game-ii gas-station hand-of-straights
        merge-triplets-to-form-target-triplet partition-labels valid-parenthesis-string`),
      s('Intervals', `insert-interval merge-intervals non-overlapping-intervals meeting-rooms meeting-rooms-ii
        minimum-interval-to-include-each-query`),
      s('Math & Geometry', `rotate-image spiral-matrix set-matrix-zeroes happy-number plus-one powx-n multiply-strings
        detect-squares`),
      s('Bit Manipulation', `single-number number-of-1-bits counting-bits reverse-bits missing-number sum-of-two-integers
        reverse-integer`)
    ]
  },
  {
    id: 'blind75',
    name: 'Blind 75',
    short: 'B75',
    author: 'Yangshun Tay',
    url: 'https://www.teamblind.com/post/New-Year-Gift---Curated-List-of-Top-75-LeetCode-Questions-to-Save-Your-Time-OaM1orEU',
    description: 'The original curated list of 75 questions covering the patterns that come up most in interviews.',
    sections: [
      s('Array', `two-sum best-time-to-buy-and-sell-stock contains-duplicate product-of-array-except-self maximum-subarray
        maximum-product-subarray find-minimum-in-rotated-sorted-array search-in-rotated-sorted-array 3sum
        container-with-most-water`),
      s('Binary', `sum-of-two-integers number-of-1-bits counting-bits missing-number reverse-bits`),
      s('Dynamic Programming', `climbing-stairs coin-change longest-increasing-subsequence longest-common-subsequence
        word-break combination-sum-iv house-robber house-robber-ii decode-ways unique-paths jump-game`),
      s('Graph', `clone-graph course-schedule pacific-atlantic-water-flow number-of-islands longest-consecutive-sequence
        alien-dictionary graph-valid-tree number-of-connected-components-in-an-undirected-graph`),
      s('Interval', `insert-interval merge-intervals non-overlapping-intervals meeting-rooms meeting-rooms-ii`),
      s('Linked List', `reverse-linked-list linked-list-cycle merge-two-sorted-lists merge-k-sorted-lists
        remove-nth-node-from-end-of-list reorder-list`),
      s('Matrix', `set-matrix-zeroes spiral-matrix rotate-image word-search`),
      s('String', `longest-substring-without-repeating-characters longest-repeating-character-replacement
        minimum-window-substring valid-anagram group-anagrams valid-parentheses valid-palindrome
        longest-palindromic-substring palindromic-substrings encode-and-decode-strings`),
      s('Tree', `maximum-depth-of-binary-tree same-tree invert-binary-tree binary-tree-maximum-path-sum
        binary-tree-level-order-traversal serialize-and-deserialize-binary-tree subtree-of-another-tree
        construct-binary-tree-from-preorder-and-inorder-traversal validate-binary-search-tree
        kth-smallest-element-in-a-bst lowest-common-ancestor-of-a-binary-search-tree implement-trie-prefix-tree
        design-add-and-search-words-data-structure word-search-ii`),
      s('Heap', `top-k-frequent-elements find-median-from-data-stream`)
    ]
  },
  {
    id: 'grind75',
    name: 'Grind 75',
    short: 'G75',
    author: 'Yangshun Tay',
    url: 'https://www.techinterviewhandbook.org/grind75',
    description: 'A refreshed Blind 75 from the same author, scheduled as an 8-week plan.',
    sections: [
      s('Week 1', `two-sum valid-parentheses merge-two-sorted-lists best-time-to-buy-and-sell-stock valid-palindrome
        invert-binary-tree valid-anagram binary-search flood-fill lowest-common-ancestor-of-a-binary-search-tree
        balanced-binary-tree linked-list-cycle implement-queue-using-stacks`),
      s('Week 2', `first-bad-version ransom-note climbing-stairs longest-palindrome reverse-linked-list majority-element
        add-binary diameter-of-binary-tree middle-of-the-linked-list maximum-depth-of-binary-tree contains-duplicate
        maximum-subarray`),
      s('Week 3', `insert-interval 01-matrix k-closest-points-to-origin longest-substring-without-repeating-characters
        3sum binary-tree-level-order-traversal clone-graph evaluate-reverse-polish-notation`),
      s('Week 4', `course-schedule implement-trie-prefix-tree coin-change product-of-array-except-self min-stack
        validate-binary-search-tree number-of-islands rotting-oranges`),
      s('Week 5', `search-in-rotated-sorted-array combination-sum permutations merge-intervals
        lowest-common-ancestor-of-a-binary-tree time-based-key-value-store accounts-merge sort-colors`),
      s('Week 6', `word-break partition-equal-subset-sum string-to-integer-atoi spiral-matrix subsets
        binary-tree-right-side-view longest-palindromic-substring unique-paths`),
      s('Week 7', `construct-binary-tree-from-preorder-and-inorder-traversal container-with-most-water
        letter-combinations-of-a-phone-number word-search find-all-anagrams-in-a-string minimum-height-trees
        task-scheduler lru-cache`),
      s('Week 8', `kth-smallest-element-in-a-bst minimum-window-substring serialize-and-deserialize-binary-tree
        trapping-rain-water find-median-from-data-stream word-ladder basic-calculator
        maximum-profit-in-job-scheduling merge-k-sorted-lists largest-rectangle-in-histogram`)
    ]
  },
  {
    id: 'lc75',
    name: 'LeetCode 75',
    short: 'LC75',
    author: 'LeetCode',
    url: 'https://leetcode.com/studyplan/leetcode-75/',
    description: "LeetCode's official study plan: 75 essential problems, gentler on-ramp than Blind 75.",
    sections: [
      s('Array / String', `merge-strings-alternately greatest-common-divisor-of-strings
        kids-with-the-greatest-number-of-candies can-place-flowers reverse-vowels-of-a-string
        reverse-words-in-a-string product-of-array-except-self increasing-triplet-subsequence string-compression`),
      s('Two Pointers', `move-zeroes is-subsequence container-with-most-water max-number-of-k-sum-pairs`),
      s('Sliding Window', `maximum-average-subarray-i maximum-number-of-vowels-in-a-substring-of-given-length
        max-consecutive-ones-iii longest-subarray-of-1s-after-deleting-one-element`),
      s('Prefix Sum', `find-the-highest-altitude find-pivot-index`),
      s('Hash Map / Set', `find-the-difference-of-two-arrays unique-number-of-occurrences
        determine-if-two-strings-are-close equal-row-and-column-pairs`),
      s('Stack', `removing-stars-from-a-string asteroid-collision decode-string`),
      s('Queue', `number-of-recent-calls dota2-senate`),
      s('Linked List', `delete-the-middle-node-of-a-linked-list odd-even-linked-list reverse-linked-list
        maximum-twin-sum-of-a-linked-list`),
      s('Binary Tree – DFS', `maximum-depth-of-binary-tree leaf-similar-trees count-good-nodes-in-binary-tree path-sum-iii
        longest-zigzag-path-in-a-binary-tree lowest-common-ancestor-of-a-binary-tree`),
      s('Binary Tree – BFS', `binary-tree-right-side-view maximum-level-sum-of-a-binary-tree`),
      s('Binary Search Tree', `search-in-a-binary-search-tree delete-node-in-a-bst`),
      s('Graphs – DFS', `keys-and-rooms number-of-provinces reorder-routes-to-make-all-paths-lead-to-the-city-zero
        evaluate-division`),
      s('Graphs – BFS', `nearest-exit-from-entrance-in-maze rotting-oranges`),
      s('Heap / Priority Queue', `kth-largest-element-in-an-array smallest-number-in-infinite-set
        maximum-subsequence-score total-cost-to-hire-k-workers`),
      s('Binary Search', `guess-number-higher-or-lower successful-pairs-of-spells-and-potions find-peak-element
        koko-eating-bananas`),
      s('Backtracking', `letter-combinations-of-a-phone-number combination-sum-iii`),
      s('DP – 1D', `n-th-tribonacci-number min-cost-climbing-stairs house-robber domino-and-tromino-tiling`),
      s('DP – Multidimensional', `unique-paths longest-common-subsequence
        best-time-to-buy-and-sell-stock-with-transaction-fee edit-distance`),
      s('Bit Manipulation', `counting-bits single-number minimum-flips-to-make-a-or-b-equal-to-c`),
      s('Trie', `implement-trie-prefix-tree search-suggestions-system`),
      s('Intervals', `non-overlapping-intervals minimum-number-of-arrows-to-burst-balloons`),
      s('Monotonic Stack', `daily-temperatures online-stock-span`)
    ]
  },
  {
    id: 'top150',
    name: 'Top Interview 150',
    short: 'TI',
    author: 'LeetCode',
    url: 'https://leetcode.com/studyplan/top-interview-150/',
    description: "LeetCode's 150 most-asked interview classics, grouped by topic.",
    sections: [
      s('Array / String', `merge-sorted-array remove-element remove-duplicates-from-sorted-array
        remove-duplicates-from-sorted-array-ii majority-element rotate-array best-time-to-buy-and-sell-stock
        best-time-to-buy-and-sell-stock-ii jump-game jump-game-ii h-index insert-delete-getrandom-o1
        product-of-array-except-self gas-station candy trapping-rain-water roman-to-integer integer-to-roman
        length-of-last-word longest-common-prefix reverse-words-in-a-string zigzag-conversion
        find-the-index-of-the-first-occurrence-in-a-string text-justification`),
      s('Two Pointers', `valid-palindrome is-subsequence two-sum-ii-input-array-is-sorted container-with-most-water 3sum`),
      s('Sliding Window', `minimum-size-subarray-sum longest-substring-without-repeating-characters
        substring-with-concatenation-of-all-words minimum-window-substring`),
      s('Matrix', `valid-sudoku spiral-matrix rotate-image set-matrix-zeroes game-of-life`),
      s('Hashmap', `ransom-note isomorphic-strings word-pattern valid-anagram group-anagrams two-sum happy-number
        contains-duplicate-ii longest-consecutive-sequence`),
      s('Intervals', `summary-ranges merge-intervals insert-interval minimum-number-of-arrows-to-burst-balloons`),
      s('Stack', `valid-parentheses simplify-path min-stack evaluate-reverse-polish-notation basic-calculator`),
      s('Linked List', `linked-list-cycle add-two-numbers merge-two-sorted-lists copy-list-with-random-pointer
        reverse-linked-list-ii reverse-nodes-in-k-group remove-nth-node-from-end-of-list
        remove-duplicates-from-sorted-list-ii rotate-list partition-list lru-cache`),
      s('Binary Tree General', `maximum-depth-of-binary-tree same-tree invert-binary-tree symmetric-tree
        construct-binary-tree-from-preorder-and-inorder-traversal construct-binary-tree-from-inorder-and-postorder-traversal
        populating-next-right-pointers-in-each-node-ii flatten-binary-tree-to-linked-list path-sum
        sum-root-to-leaf-numbers binary-tree-maximum-path-sum binary-search-tree-iterator count-complete-tree-nodes
        lowest-common-ancestor-of-a-binary-tree`),
      s('Binary Tree BFS', `binary-tree-right-side-view average-of-levels-in-binary-tree binary-tree-level-order-traversal
        binary-tree-zigzag-level-order-traversal`),
      s('Binary Search Tree', `minimum-absolute-difference-in-bst kth-smallest-element-in-a-bst
        validate-binary-search-tree`),
      s('Graph General', `number-of-islands surrounded-regions clone-graph evaluate-division course-schedule
        course-schedule-ii`),
      s('Graph BFS', `snakes-and-ladders minimum-genetic-mutation word-ladder`),
      s('Trie', `implement-trie-prefix-tree design-add-and-search-words-data-structure word-search-ii`),
      s('Backtracking', `letter-combinations-of-a-phone-number combinations permutations combination-sum n-queens-ii
        generate-parentheses word-search`),
      s('Divide & Conquer', `convert-sorted-array-to-binary-search-tree sort-list construct-quad-tree
        merge-k-sorted-lists`),
      s('Kadane’s Algorithm', `maximum-subarray maximum-sum-circular-subarray`),
      s('Binary Search', `search-insert-position search-a-2d-matrix find-peak-element search-in-rotated-sorted-array
        find-first-and-last-position-of-element-in-sorted-array find-minimum-in-rotated-sorted-array
        median-of-two-sorted-arrays`),
      s('Heap', `kth-largest-element-in-an-array ipo find-k-pairs-with-smallest-sums find-median-from-data-stream`),
      s('Bit Manipulation', `add-binary reverse-bits number-of-1-bits single-number single-number-ii
        bitwise-and-of-numbers-range`),
      s('Math', `palindrome-number plus-one factorial-trailing-zeroes sqrtx powx-n max-points-on-a-line`),
      s('1D DP', `climbing-stairs house-robber word-break coin-change longest-increasing-subsequence`),
      s('Multidimensional DP', `triangle minimum-path-sum unique-paths-ii longest-palindromic-substring
        interleaving-string edit-distance best-time-to-buy-and-sell-stock-iii best-time-to-buy-and-sell-stock-iv
        maximal-square`)
    ]
  }
]

export const listSlugs = (l: StudyList): string[] => l.sections.flatMap((sec) => sec.slugs)

export interface ListProgress {
  total: number
  solved: number
  byDifficulty: Record<Difficulty, { total: number; solved: number }>
}

export function listProgress(slugs: string[], bySlug: Map<string, ProblemSummary>): ListProgress {
  const byDifficulty = { Easy: { total: 0, solved: 0 }, Medium: { total: 0, solved: 0 }, Hard: { total: 0, solved: 0 } }
  let solved = 0
  for (const slug of slugs) {
    const p = bySlug.get(slug)
    const ac = p?.status === 'ac'
    if (ac) solved++
    if (p) {
      byDifficulty[p.difficulty].total++
      if (ac) byDifficulty[p.difficulty].solved++
    }
  }
  return { total: slugs.length, solved, byDifficulty }
}
