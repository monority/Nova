export interface RandomSource {
  next(): number
  nextInt(min: number, max: number): number
  nextFloat(min: number, max: number): number
}

function normalizeSeed(seed: number): number {
  if (!Number.isFinite(seed)) throw new Error('Seed must be finite')
  const normalized = (Math.trunc(seed) >>> 0) || 0x6d2b79f5
  return normalized
}

export function createRandom(seed: number): RandomSource {
  let state = normalizeSeed(seed)

  const next = () => {
    state = Math.imul(state ^ (state >>> 15), state | 1)
    state ^= state + Math.imul(state ^ (state >>> 7), state | 61)
    return ((state ^ (state >>> 14)) >>> 0) / 4294967296
  }

  return {
    next,
    nextInt(min, max) {
      if (!Number.isInteger(min) || !Number.isInteger(max) || min > max) throw new Error('Invalid integer range')
      return Math.floor(next() * (max - min + 1)) + min
    },
    nextFloat(min, max) {
      if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) throw new Error('Invalid float range')
      return next() * (max - min) + min
    },
  }
}
