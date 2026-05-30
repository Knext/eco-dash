import type { IndicatorPlugin } from '../types'

const VIXCLS: IndicatorPlugin = {
  def: {
    id: 'VIXCLS',
    name: 'VIX',
    nameKr: 'VIX 지수',
    category: 'volatility',
    unit: 'index',
    precision: 2,
    thresholds: { normal: [0, 20], watch: [20, 30], alert: [30, 999], direction: 'above' },
    updateCadence: 'daily',
    description: 'S&P 500 옵션 30일 implied volatility, 공포지수',
    mainView: true,
  },
  fetcher: {
    source: 'fred',
    options: { series: 'VIXCLS' },
    fallback: { source: 'yfinance', options: { ticker: '^VIX' } },
  },
}

export default VIXCLS
