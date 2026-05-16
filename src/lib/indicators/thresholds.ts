import type { IndicatorDef, IndicatorStatus, ThresholdConfig } from './types'

export function statusFor(def: IndicatorDef, value: number): IndicatorStatus {
  return judge(def.thresholds, value)
}

export function judge(t: ThresholdConfig, value: number): IndicatorStatus {
  const inRange = (range: readonly [number, number]) => value >= range[0] && value < range[1]
  if (t.direction === 'above') {
    if (inRange(t.alert)) return 'alert'
    if (inRange(t.watch)) return 'watch'
    return 'normal'
  } else {
    if (inRange(t.alert)) return 'alert'
    if (inRange(t.watch)) return 'watch'
    return 'normal'
  }
}

export function isStale(def: IndicatorDef, asOf: string): boolean {
  const ageMs = Date.now() - new Date(asOf).getTime()
  const ageDays = ageMs / (1000 * 60 * 60 * 24)
  switch (def.updateCadence) {
    case 'daily':
      return ageDays > 4
    case 'weekly':
      return ageDays > 10
    case 'monthly':
      return ageDays > 50
    default:
      return false
  }
}
