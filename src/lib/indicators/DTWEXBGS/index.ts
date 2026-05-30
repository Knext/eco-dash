import type { IndicatorPlugin } from '../types'

const DTWEXBGS: IndicatorPlugin = {
  def: {
    id: 'DTWEXBGS',
    name: 'DXY',
    nameKr: '달러 인덱스',
    category: 'fx',
    unit: 'index',
    precision: 2,
    thresholds: { normal: [0, 100], watch: [100, 105], alert: [105, 999], direction: 'above' },
    updateCadence: 'daily',
    description: 'ICE 달러 인덱스 (시장 표준). FRED 광의 무역가중은 폴백.',
  },
  fetcher: {
    source: 'yfinance',
    options: { ticker: 'DX-Y.NYB' },
    fallback: { source: 'fred', options: { series: 'DTWEXBGS' } },
  },
}

export default DTWEXBGS
