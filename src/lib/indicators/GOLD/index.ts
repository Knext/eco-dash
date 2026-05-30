import type { IndicatorPlugin } from '../types'

const GOLD: IndicatorPlugin = {
  def: {
    id: 'GOLD',
    name: 'Gold',
    nameKr: '금',
    category: 'commodity',
    unit: 'usd',
    precision: 2,
    thresholds: { normal: [0, 9999], watch: [0, 9999], alert: [0, 9999], direction: 'above' },
    updateCadence: 'daily',
    description: 'COMEX gold futures (FRED LBMA series discontinued 2017)',
  },
  fetcher: {
    source: 'yfinance',
    options: { ticker: 'GC=F' },
    fallback: { source: 'stooq', options: { symbol: 'gc.f' } },
  },
}

export default GOLD
