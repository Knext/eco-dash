import type { IndicatorPlugin } from '../types'

const T10Y3M: IndicatorPlugin = {
  def: {
    id: 'T10Y3M',
    name: 'T10Y3M',
    nameKr: '10Y-3M 스프레드',
    category: 'rates',
    unit: 'pct',
    precision: 2,
    thresholds: { normal: [1, 999], watch: [0, 1], alert: [-999, 0], direction: 'below' },
    updateCadence: 'daily',
    description: 'NY Fed 침체확률 모델 핵심 입력',
    inverted: true,
    hidden: true,
  },
  fetcher: { source: 'fred', options: { series: 'T10Y3M' } },
}

export default T10Y3M
