import { describe, it, expect } from 'vitest'
import { RULES, getRule } from '@/lib/signals/rules'

describe('signal rules', () => {
  it('has 17 rules', () => {
    expect(RULES.length).toBe(17)
  })

  it('all rules have rationale and actionHint', () => {
    for (const r of RULES) {
      expect(r.rationale).toBeTruthy()
      expect(r.actionHint).toBeTruthy()
    }
  })

  it('critical opportunity rules have type=opportunity', () => {
    const ops = RULES.filter((r) => r.category === 'opportunity')
    for (const r of ops) {
      expect(r.type).toBe('opportunity')
    }
  })

  it('getRule by id', () => {
    expect(getRule('VIX_PANIC')?.severity).toBe('critical')
    expect(getRule('NON_EXISTENT')).toBeUndefined()
  })

  it('all ids are unique', () => {
    const ids = RULES.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('cooldown is positive', () => {
    for (const r of RULES) expect(r.cooldownHours).toBeGreaterThan(0)
  })
})
