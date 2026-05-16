import { getCurrentRegime, insertRegime } from '../db/queries'
import type { EvaluationContext } from './evaluator'
import type { Regime, RegimeAssessment } from './types'

export async function classifyRegime(ctx: EvaluationContext): Promise<RegimeAssessment> {
  const vix = ctx.indicators.get('VIXCLS')
  const hy = ctx.indicators.get('BAMLH0A0HYM2')
  const cpi = ctx.indicators.get('CPILFESL')
  const t10y2y = ctx.indicators.get('T10Y2Y')
  const kr = ctx.indicators.get('KR_EXPORT')

  const vix60 = vix?.rollingMean60 ?? null
  const vixLatest = vix?.latest ?? null
  const hyLatest = hy?.latest ?? null
  const cpiYoy = cpi?.yoy ?? null
  const t10y2yMean = t10y2y?.rollingMean60 ?? null
  const krLatest = kr?.latest ?? null

  let regime: Regime = 'risk_on'
  const triggers: string[] = []

  // Recession check (highest priority)
  if (
    t10y2yMean !== null && t10y2yMean < 0 &&
    hyLatest !== null && hyLatest > 6 &&
    vix60 !== null && vix60 > 25
  ) {
    regime = 'recession'
    triggers.push('T10Y2Y역전 6M', `HY OAS ${hyLatest.toFixed(2)}%`, `VIX 60일 ${vix60.toFixed(1)}`)
  }
  // Stagflation check
  else if (cpiYoy !== null && cpiYoy > 4 && krLatest !== null && krLatest < 0) {
    regime = 'stagflation'
    triggers.push(`Core CPI YoY ${cpiYoy.toFixed(1)}%`, `KR수출 YoY ${krLatest.toFixed(1)}%`)
  }
  // Risk-Off
  else if (
    (vixLatest !== null && vixLatest > 25) ||
    (hyLatest !== null && hyLatest > 5)
  ) {
    regime = 'risk_off'
    if (vixLatest !== null) triggers.push(`VIX ${vixLatest.toFixed(1)}`)
    if (hyLatest !== null && hyLatest > 5) triggers.push(`HY OAS ${hyLatest.toFixed(2)}%`)
  }
  // Goldilocks
  else if (
    cpiYoy !== null && cpiYoy < 2.5 &&
    vixLatest !== null && vixLatest < 18 &&
    krLatest !== null && krLatest > 0
  ) {
    regime = 'goldilocks'
    triggers.push(`Core CPI ${cpiYoy.toFixed(1)}%`, `VIX ${vixLatest.toFixed(1)}`, `KR수출 ${krLatest.toFixed(1)}%`)
  }
  // Default: risk_on
  else {
    if (vixLatest !== null) triggers.push(`VIX ${vixLatest.toFixed(1)}`)
    if (hyLatest !== null) triggers.push(`HY ${hyLatest.toFixed(2)}%`)
  }

  const current = await getCurrentRegime()
  const prevRegime = current?.regime ?? null
  const enteredAt = current?.regime === regime ? current.entered_at : ctx.now.toISOString()

  if (!current || current.regime !== regime) {
    await insertRegime({
      entered_at: enteredAt,
      regime,
      confidence: 0.7,
      trigger_summary: triggers.join(' / '),
    })
  }

  return {
    current: regime,
    enteredAt,
    previous: prevRegime,
    confidence: 0.7,
    triggerSummary: triggers.join(' / '),
  }
}
