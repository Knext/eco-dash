import type { DetailRendererProps } from '@/lib/indicators/types'
import { IndicatorHistoryChart } from '@/components/widgets/IndicatorHistoryChart'

/**
 * Default detail chart — a single line chart with threshold reference
 * lines, used by every indicator without a custom DetailPlugin.
 */
export function DefaultDetail({ def, snapshot }: DetailRendererProps) {
  // Convert readonly history → mutable Point[] for Recharts. The
  // existing IndicatorHistoryChart was authored before the snapshot
  // contract existed, so it takes Point[]; spreading keeps that
  // boundary stable without forcing a chart refactor.
  const points = snapshot.history.map((h) => ({ asOf: h.asOf, value: h.value }))
  return <IndicatorHistoryChart points={points} thresholds={def.thresholds} />
}
