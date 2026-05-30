import type { IndicatorPlugin } from '../types'

const USDJPY: IndicatorPlugin = {
  def: {
    id: 'USDJPY',
    name: 'USD/JPY',
    nameKr: '달러/엔',
    category: 'fx',
    unit: 'index',
    precision: 2,
    thresholds: { normal: [0, 99999], watch: [0, 99999], alert: [0, 99999], direction: 'above' },
    updateCadence: 'daily',
    description: 'USD→JPY 환율 (yfinance JPY=X)',
  },
  fetcher: { source: 'yfinance', options: { ticker: 'JPY=X' } },
}

export default USDJPY
