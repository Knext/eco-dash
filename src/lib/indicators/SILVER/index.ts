import type { IndicatorPlugin } from '../types'

const SILVER: IndicatorPlugin = {
  def: {
    id: 'SILVER',
    name: 'Silver',
    nameKr: '은',
    category: 'commodity',
    unit: 'usd',
    precision: 2,
    thresholds: { normal: [0, 9999], watch: [0, 9999], alert: [0, 9999], direction: 'above' },
    updateCadence: 'daily',
    description: 'COMEX silver futures (yfinance SI=F)',
  },
  fetcher: {
    source: 'yfinance',
    options: { ticker: 'SI=F' },
    fallback: { source: 'stooq', options: { symbol: 'si.f' } },
  },
}

export default SILVER
