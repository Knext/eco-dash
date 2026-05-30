import type { IndicatorPlugin } from '../types'

const COPPER: IndicatorPlugin = {
  def: {
    id: 'COPPER',
    name: 'Copper',
    nameKr: '구리',
    category: 'commodity',
    unit: 'usd',
    precision: 4,
    thresholds: { normal: [0, 9999], watch: [0, 9999], alert: [0, 9999], direction: 'above' },
    updateCadence: 'daily',
    description: 'COMEX copper futures, USD/lb (yfinance HG=F)',
  },
  fetcher: {
    source: 'yfinance',
    options: { ticker: 'HG=F' },
    fallback: { source: 'stooq', options: { symbol: 'hg.f' } },
  },
}

export default COPPER
