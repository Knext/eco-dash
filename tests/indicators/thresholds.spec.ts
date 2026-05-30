import { describe, it, expect } from 'vitest'
import { judge, isStale } from '@/lib/indicators/thresholds'
import type { IndicatorDef } from '@/lib/indicators/types'

describe('thresholds.judge', () => {
  const t = {
    normal: [0, 20] as [number, number],
    watch: [20, 30] as [number, number],
    alert: [30, 999] as [number, number],
    direction: 'above' as const,
  }

  it('classifies below thresholds as normal', () => {
    expect(judge(t, 10)).toBe('normal')
  })

  it('classifies watch range', () => {
    expect(judge(t, 25)).toBe('watch')
  })

  it('classifies alert range', () => {
    expect(judge(t, 40)).toBe('alert')
  })

  it('handles boundaries', () => {
    expect(judge(t, 20)).toBe('watch')
    expect(judge(t, 30)).toBe('alert')
  })
})

describe('thresholds.isStale', () => {
  const def: IndicatorDef = {
    id: 'TEST',
    name: 'Test',
    nameKr: '테스트',
    category: 'rates',
    unit: 'pct',
    precision: 2,
    thresholds: { normal: [0, 1], watch: [1, 2], alert: [2, 999], direction: 'above' },
    updateCadence: 'daily',
  }

  it('returns false for recent data', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    expect(isStale(def, yesterday)).toBe(false)
  })

  it('returns true for old daily data', () => {
    const week = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    expect(isStale(def, week)).toBe(true)
  })
})
