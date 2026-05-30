import type { IndicatorPlugin } from '../types'

const T10YIE: IndicatorPlugin = {
  def: {
    id: 'T10YIE',
    name: 'BEI 10Y',
    nameKr: '10Y 기대인플레',
    category: 'inflation',
    unit: 'pct',
    precision: 2,
    thresholds: { normal: [0, 2.5], watch: [2.5, 3], alert: [3, 999], direction: 'above' },
    updateCadence: 'daily',
    description: '10Y 명목금리 - TIPS = 기대인플레이션',
  },
  fetcher: { source: 'fred', options: { series: 'T10YIE' } },
}

export default T10YIE
