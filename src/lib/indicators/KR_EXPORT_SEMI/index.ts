import type { IndicatorPlugin } from '../types'

const KR_EXPORT_SEMI: IndicatorPlugin = {
  def: {
    id: 'KR_EXPORT_SEMI',
    name: 'KR Semi YoY',
    nameKr: '반도체 수출 YoY',
    category: 'korea',
    unit: 'pct',
    precision: 1,
    thresholds: { normal: [0, 999], watch: [-10, 0], alert: [-999, -10], direction: 'below' },
    updateCadence: 'monthly',
    description: '반도체 수출 YoY (HS 8542). manual entry 권장.',
    inverted: true,
  },
  fetcher: {
    source: 'kosis',
    options: { paramKey: 'EXPORT_SEMICONDUCTOR_YOY' },
    fallback: { source: 'manual', options: {} },
  },
}

export default KR_EXPORT_SEMI
