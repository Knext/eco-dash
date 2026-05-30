import type { IndicatorPlugin } from '../types'

const KR_EXPORT: IndicatorPlugin = {
  def: {
    id: 'KR_EXPORT',
    name: 'KR Export YoY',
    nameKr: '한국 수출 YoY',
    category: 'korea',
    unit: 'pct',
    precision: 1,
    thresholds: { normal: [0, 999], watch: [-5, 0], alert: [-999, -5], direction: 'below' },
    updateCadence: 'monthly',
    releaseTimeET: '20:00',
    description: '한국 수출 전년동월대비, KOSPI EPS와 r≈0.7. 산자부 발표 후 manual entry 권장.',
    inverted: true,
  },
  fetcher: {
    source: 'kosis',
    options: { paramKey: 'EXPORT_TOTAL_YOY' },
    fallback: { source: 'manual', options: {} },
  },
}

export default KR_EXPORT
