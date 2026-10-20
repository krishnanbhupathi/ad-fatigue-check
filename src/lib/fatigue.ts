export type Status = 'healthy' | 'wearing' | 'burnt'

export interface Reading {
  status: Status
  peak: number
  peakDay: number
  now: number
  drop: number
  slope: number
  daysToHalf: number | null
  reasons: string[]
}

// Rules of thumb, not platform numbers. Kept in one place so they're easy to tune.
export const RULES = {
  wearingDrop: 0.2,
  burntDrop: 0.4,
  wearingFreq: 3,
  burntFreq: 5,
  window: 3,
  trendDays: 7,
  // Below this daily fall, or beyond this horizon, a forecast is just noise.
  minFall: 0.005,
  horizon: 60,
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length

export function rolling(ctr: number[], w = RULES.window): number[] {
  return ctr.map((_, i) => mean(ctr.slice(Math.max(0, i - w + 1), i + 1)))
}

// Least-squares slope, in CTR points per day.
export function slope(ys: number[]): number {
  const n = ys.length
  if (n < 2) return 0
  const mx = (n - 1) / 2
  const my = mean(ys)
  let num = 0
  let den = 0
  ys.forEach((y, x) => {
    num += (x - mx) * (y - my)
    den += (x - mx) ** 2
  })
  return num / den
}

export function read(ctr: number[], freq: number): Reading {
  if (ctr.length < RULES.trendDays) throw new Error(`Need at least ${RULES.trendDays} days`)
  const avg = rolling(ctr)
  const from = RULES.window - 1
  let peakDay = from
  for (let i = from; i < avg.length; i++) if (avg[i] > avg[peakDay]) peakDay = i
  const peak = avg[peakDay]
  const now = avg[avg.length - 1]
  const drop = peak > 0 ? Math.max(0, 1 - now / peak) : 0
  const s = slope(ctr.slice(-RULES.trendDays))
  let daysToHalf: number | null = null
  if (now <= peak / 2) daysToHalf = 0
  else if (s < -RULES.minFall) {
    const d = (now - peak / 2) / -s
    if (d <= RULES.horizon) daysToHalf = d
  }

  const reasons: string[] = []
  if (drop >= RULES.wearingDrop) reasons.push(`CTR is ${Math.round(drop * 100)}% below its peak`)
  if (freq >= RULES.wearingFreq) reasons.push(`people see it ${freq.toFixed(1)} times on average`)

  let status: Status = 'healthy'
  if (drop >= RULES.burntDrop || freq >= RULES.burntFreq) status = 'burnt'
  else if (drop >= RULES.wearingDrop || freq >= RULES.wearingFreq) status = 'wearing'

  return { status, peak, peakDay, now, drop, slope: s, daysToHalf, reasons }
}

export function parse(text: string): number[] {
  return text
    .split(/[\s,;]+/)
    .map(t => parseFloat(t.replace('%', '')))
    .filter(n => Number.isFinite(n) && n >= 0)
}
