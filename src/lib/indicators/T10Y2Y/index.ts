import type { IndicatorPlugin } from '../types'

const T10Y2Y: IndicatorPlugin = {
  def: {
    id: 'T10Y2Y',
    name: 'T10Y2Y',
    nameKr: '10Y-2Y 스프레드',
    category: 'rates',
    unit: 'pct',
    precision: 2,
    thresholds: { normal: [0.5, 999], watch: [0, 0.5], alert: [-999, 0], direction: 'below' },
    updateCadence: 'daily',
    description: '학술적 침체 예측력 1위',
    inverted: true,
  },
  fetcher: { source: 'fred', options: { series: 'T10Y2Y' } },
}

export default T10Y2Y
