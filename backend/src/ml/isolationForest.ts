type Node = {
  feature: number
  split: number
  left: Node | null
  right: Node | null
  size: number
}

function cFactor(n: number): number {
  if (n <= 1) return 0
  if (n === 2) return 1
  return 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1)) / n
}

function rngFrom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function build(sample: number[][], height: number, maxH: number, rand: () => number): Node {
  const leaf = (size: number): Node => ({ feature: -1, split: 0, left: null, right: null, size })
  if (sample.length <= 1 || height >= maxH) return leaf(sample.length)
  const dims = sample[0]?.length ?? 0
  if (dims === 0) return leaf(sample.length)
  const feature = Math.floor(rand() * dims)
  let min = Infinity
  let max = -Infinity
  for (const row of sample) {
    const value = row[feature] ?? 0
    if (value < min) min = value
    if (value > max) max = value
  }
  if (!(max > min)) return leaf(sample.length)
  const split = min + rand() * (max - min)
  const leftRows = sample.filter((row) => (row[feature] ?? 0) < split)
  const rightRows = sample.filter((row) => (row[feature] ?? 0) >= split)
  if (leftRows.length === 0 || rightRows.length === 0) return leaf(sample.length)
  return {
    feature,
    split,
    left: build(leftRows, height + 1, maxH, rand),
    right: build(rightRows, height + 1, maxH, rand),
    size: sample.length,
  }
}

function pathLength(node: Node, row: number[], depth: number): number {
  if (!node.left || !node.right || node.feature < 0) return depth + cFactor(node.size)
  const value = row[node.feature] ?? 0
  return pathLength(value < node.split ? node.left : node.right, row, depth + 1)
}

/** Unsupervised Isolation Forest. Score near 1 means easier to isolate (more unusual). */
export function isolationScores(rows: number[][], trees = 40): number[] {
  const n = rows.length
  if (n < 3) return rows.map(() => 0)
  const sampleSize = Math.min(64, n)
  const maxH = Math.max(1, Math.ceil(Math.log2(sampleSize)))
  const seed = rows.reduce((sum, row) => sum + row.reduce((a, b) => a + b, 0), n * 17)
  const rand = rngFrom(Math.floor(seed * 1000) || 1)
  const forest: Node[] = []
  for (let t = 0; t < trees; t++) {
    const sample: number[][] = []
    for (let i = 0; i < sampleSize; i++) {
      const row = rows[Math.floor(rand() * n)]
      if (row) sample.push(row)
    }
    forest.push(build(sample, 0, maxH, rand))
  }
  const norm = cFactor(sampleSize) || 1
  return rows.map((row) => {
    const avg = forest.reduce((sum, tree) => sum + pathLength(tree, row, 0), 0) / forest.length
    return 2 ** (-avg / norm)
  })
}
