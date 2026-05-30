import type { IndicatorPlugin } from '../types'

const KOSPI: IndicatorPlugin = {
  def: {
    id: 'KOSPI',
    name: 'KOSPI',
    nameKr: 'KOSPI 지수',
    category: 'equity',
    unit: 'index',
    precision: 2,
    thresholds: { normal: [0, 99999], watch: [0, 99999], alert: [0, 99999], direction: 'above' },
    updateCadence: 'daily',
  },
  fetcher: {
    source: 'yfinance',
    options: { ticker: '^KS11' },
    fallback: { source: 'stooq', options: { symbol: '^kospi' } },
  },
}

export default KOSPI
