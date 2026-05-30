import type { IndicatorPlugin } from '../types'

const SP500: IndicatorPlugin = {
  def: {
    id: 'SP500',
    name: 'S&P 500',
    nameKr: 'S&P 500',
    category: 'equity',
    unit: 'index',
    precision: 2,
    thresholds: { normal: [0, 99999], watch: [0, 99999], alert: [0, 99999], direction: 'above' },
    updateCadence: 'daily',
  },
  fetcher: {
    source: 'yfinance',
    options: { ticker: '^GSPC' },
    fallback: { source: 'fred', options: { series: 'SP500' } },
  },
}

export default SP500
