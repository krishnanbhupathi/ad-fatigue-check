import { describe, expect, it } from 'vitest'
import { parse, read, rolling, slope } from './fatigue'

const fresh = [1.6, 1.7, 1.8, 1.8, 1.9, 1.85, 1.9, 1.95, 1.9, 1.92, 1.88, 1.9, 1.93, 1.9]
const wearing = [1.9, 2.1, 2.2, 2.25, 2.2, 2.1, 2.0, 1.9, 1.8, 1.72, 1.65, 1.58, 1.5, 1.44]
const burnt = [2.4, 2.5, 2.4, 2.2, 2.0, 1.8, 1.6, 1.45, 1.3, 1.2, 1.1, 1.0, 0.95, 0.9]

describe('read', () => {
  it('calls a steady ad healthy', () => {
    const r = read(fresh, 1.8)
    expect(r.status).toBe('healthy')
    expect(r.daysToHalf).toBeNull()
  })
  it('flags a fading ad as wearing out and projects when it halves', () => {
    const r = read(wearing, 2.4)
    expect(r.status).toBe('wearing')
    expect(r.drop).toBeGreaterThan(0.2)
    expect(r.daysToHalf).toBeGreaterThan(0)
  })
  it('calls it burnt out past a 40% drop', () => {
    expect(read(burnt, 2).status).toBe('burnt')
  })
  it('lets high frequency alone raise the status', () => {
    expect(read(fresh, 3.4).status).toBe('wearing')
    expect(read(fresh, 5.2).status).toBe('burnt')
  })
  it('reports zero days once CTR is already at half its peak', () => {
    expect(read([4, 4, 4, 3, 2, 1.5, 1.4, 1.2, 1], 1).daysToHalf).toBe(0)
  })
  it('needs a week of data', () => {
    expect(() => read([1, 2, 3], 1)).toThrow()
  })
})

describe('helpers', () => {
  it('averages over a 3-day window', () => {
    expect(rolling([3, 6, 9, 12])).toEqual([3, 4.5, 6, 9])
  })
  it('fits a straight line', () => {
    expect(slope([5, 4, 3, 2])).toBeCloseTo(-1)
  })
  it('parses pasted numbers in any common format', () => {
    expect(parse('1.2%, 1.1\n0.9 ;x 0.8')).toEqual([1.2, 1.1, 0.9, 0.8])
  })
})
