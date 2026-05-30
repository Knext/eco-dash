import { RULES } from './rules'
import type { ActiveSignal, SignalRule } from './types'
import {
  getCooldown,
  getRecentValues,
  insertSignal,
  resolveSignal,
  upsertCooldown,
  bumpFalseStreak,
  resetFalseStreak,
} from '../db/queries'
import {
  lastValue,
  momAnnualized,
  pctBelow200dma,
  rollingMean,
  sustainedBelowCalendar,
  toPoints,
  yoy,
} from '../indicators/normalize'
import { INDICATORS } from '../indicators/registry'
import type { Point } from '../indicators/normalize'

const HYSTERESIS_FALSE_THRESHOLD = 3
const SIX_MONTHS_DAYS = 180

interface IndicatorContext {
  latest: number | null
  yoy: number | null
  momAnnualized: number | null
  rollingMean60: number | null
  pctBelow200dma: number | null
  points: Point[]
  rawPoints: Point[]
  momAnnualizedPoints: Point[]
}

export interface EvaluationContext {
  indicators: Map<string, IndicatorContext>
  now: Date
}

export async function buildContext(now: Date = new Date()): Promise<EvaluationContext> {
  const ctx = new Map<string, IndicatorContext>()
  for (const def of INDICATORS) {
    const rows = await getRecentValues(def.id, 1200)
    const rawPoints = toPoints(rows)
    const yoyPoints = def.transform === 'yoy' ? yoy(rawPoints) : []
    const momAnnPoints = momAnnualized(rawPoints)
    const points = yoyPoints.length > 0 ? yoyPoints : rawPoints
    const meanPoints = rollingMean(points, 60)
    ctx.set(def.id, {
      latest: lastValue(points),
      yoy: yoyPoints.length > 0 ? lastValue(yoyPoints) : null,
      momAnnualized: lastValue(momAnnPoints),
      rollingMean60: lastValue(meanPoints),
      pctBelow200dma: pctBelow200dma(rawPoints),
      points,
      rawPoints,
      momAnnualizedPoints: momAnnPoints,
    })
  }
  return { indicators: ctx, now }
}

const RULE_PREDICATES: Record<string, (ctx: EvaluationContext) => boolean> = {
  VIX_WARN: (c) => greater(c.indicators.get('VIXCLS')?.latest, 30),
  VIX_PANIC: (c) => greater(c.indicators.get('VIXCLS')?.latest, 40),
  T10Y2Y_INVERT: (c) => less(c.indicators.get('T10Y2Y')?.rollingMean60, 0),
  T10Y3M_INVERT: (c) => less(c.indicators.get('T10Y3M')?.latest, 0),
  CORE_CPI_HOT: (c) => greater(c.indicators.get('CPILFESL')?.yoy, 4),
  HY_OAS_STRESS: (c) => greater(c.indicators.get('BAMLH0A0HYM2')?.latest, 6),
  HY_OAS_PANIC: (c) => greater(c.indicators.get('BAMLH0A0HYM2')?.latest, 8),
  DXY_STRONG: (c) => greater(c.indicators.get('DTWEXBGS')?.latest, 105),
  KR_EXPORT_WEAK: (c) => less(c.indicators.get('KR_EXPORT')?.latest, -5),
  KR_EXPORT_CRASH: (c) => {
    const p = c.indicators.get('KR_EXPORT')?.points
    return p ? sustainedBelowCalendar(p, -10, 95) : false
  },
  USDKRW_HIGH: (c) => greater(c.indicators.get('USDKRW')?.latest, 1350),

  RECESSION_COMPOSITE: (c) => {
    const t = c.indicators.get('T10Y2Y')
    const h = c.indicators.get('BAMLH0A0HYM2')
    const v = c.indicators.get('VIXCLS')
    if (!t || !h || !v) return false
    const sus = sustainedBelowCalendar(t.points, 0, SIX_MONTHS_DAYS)
    return sus && greater(h.latest, 6) && greater(v.rollingMean60, 25)
  },
  INFLATION_REACCEL: (c) => {
    const cpi = c.indicators.get('CPILFESL')
    const ppi = c.indicators.get('PPIACO')
    const wti = c.indicators.get('DCOILWTICO')
    if (!cpi || !ppi || !wti) return false
    const last3 = cpi.momAnnualizedPoints.slice(-3)
    const streak = last3.length >= 3 && last3.every((p) => p.value > 3.6)
    return streak && greater(ppi.yoy, 3) && greater(wti.yoy, 20)
  },
  BUY_PANIC: (c) => {
    const v = c.indicators.get('VIXCLS')
    const h = c.indicators.get('BAMLH0A0HYM2')
    const s = c.indicators.get('SP500')
    if (!v || !h || !s) return false
    return greater(v.latest, 35) && greater(h.latest, 8) && less(s.pctBelow200dma, -15)
  },
  KR_SLOWDOWN_COMPOSITE: (c) => {
    const exp = c.indicators.get('KR_EXPORT')
    const semi = c.indicators.get('KR_EXPORT_SEMI')
    const dxy = c.indicators.get('DTWEXBGS')
    if (!exp || !semi || !dxy) return false
    const sus = sustainedBelowCalendar(exp.points, -5, 95)
    return sus && less(semi.latest, -10) && greater(dxy.latest, 105)
  },
  EARLY_RECOVERY: (c) => {
    const t = c.indicators.get('T10Y2Y')
    const exp = c.indicators.get('KR_EXPORT')
    const v = c.indicators.get('VIXCLS')
    if (!t || !exp || !v) return false
    return greater(t.latest, 0) && greater(exp.latest, 0) && less(v.latest, 20)
  },
  STAGFLATION_COMPOSITE: (c) => {
    const cpi = c.indicators.get('CPILFESL')
    const dxy = c.indicators.get('DTWEXBGS')
    const exp = c.indicators.get('KR_EXPORT')
    if (!cpi || !dxy || !exp) return false
    return greater(cpi.yoy, 4) && greater(dxy.latest, 105) && less(exp.latest, 0)
  },
}

function greater(value: number | null | undefined, threshold: number): boolean {
  return value !== null && value !== undefined && Number.isFinite(value) && (value as number) > threshold
}

function less(value: number | null | undefined, threshold: number): boolean {
  return value !== null && value !== undefined && Number.isFinite(value) && (value as number) < threshold
}

export function evaluateRule(rule: SignalRule, ctx: EvaluationContext): boolean {
  const pred = RULE_PREDICATES[rule.id]
  if (!pred) return false
  try {
    return pred(ctx)
  } catch {
    return false
  }
}

/**
 * Evaluate all rules. Fires signals with hysteresis (resolve only after
 * N consecutive false evaluations) to prevent oscillation. Each fire
 * inserts the signal and updates cooldown in a single transaction.
 */
export async function evaluateAll(ctx?: EvaluationContext): Promise<ActiveSignal[]> {
  const resolved = ctx ?? (await buildContext())
  const fired: ActiveSignal[] = []
  const now = resolved.now.toISOString()

  for (const rule of RULES) {
    const triggered = evaluateRule(rule, resolved)

    if (!triggered) {
      const streak = await bumpFalseStreak(rule.id, now)
      if (streak >= HYSTERESIS_FALSE_THRESHOLD) {
        await resolveSignal(rule.id, now)
      }
      continue
    }

    await resetFalseStreak(rule.id, now)

    if (!(await shouldFire(rule, now))) continue

    const signal = buildSignal(rule, resolved, now)
    await insertSignal({
      id: signal.id,
      rule_id: rule.id,
      severity: rule.severity,
      category: rule.category,
      type: rule.type,
      triggered_at: now,
      resolved_at: null,
      message: signal.message,
      indicators: JSON.stringify(rule.indicators),
      action_hint: rule.actionHint,
      current_value: signal.currentValue ?? null,
    })
    await upsertCooldown(rule.id, now, rule.severity)
    fired.push(signal)
  }
  return fired
}

async function shouldFire(rule: SignalRule, now: string): Promise<boolean> {
  const cd = await getCooldown(rule.id)
  if (!cd) return true

  if (cd.last_severity === 'warning' && rule.severity === 'critical') return true
  if (cd.last_severity === 'info' && (rule.severity === 'warning' || rule.severity === 'critical')) return true

  const elapsedHours = (new Date(now).getTime() - new Date(cd.last_triggered_at).getTime()) / 36e5
  return elapsedHours >= rule.cooldownHours
}

function buildSignal(rule: SignalRule, ctx: EvaluationContext, triggeredAt: string): ActiveSignal {
  const id = `${rule.id}_${triggeredAt}`
  const parts: string[] = []
  for (const indId of rule.indicators) {
    const ic = ctx.indicators.get(indId)
    if (!ic) continue
    const v = ic.yoy ?? ic.latest
    if (v !== null) parts.push(`${indId}=${v.toFixed(2)}`)
  }
  return {
    id,
    ruleId: rule.id,
    severity: rule.severity,
    category: rule.category,
    type: rule.type,
    triggeredAt,
    message: rule.name,
    indicators: rule.indicators,
    actionHint: rule.actionHint,
    currentValue: parts.join(', '),
  }
}
