import type { IndicatorPlugin } from '../types'

const DCOILWTICO: IndicatorPlugin = {
  def: {
    id: 'DCOILWTICO',
    name: 'WTI',
    nameKr: 'WTI 원유',
    category: 'commodity',
    unit: 'usd',
    precision: 2,
    thresholds: { normal: [50, 90], watch: [90, 110], alert: [110, 999], direction: 'above' },
    updateCadence: 'daily',
  },
  fetcher: {
    source: 'yfinance',
    options: { ticker: 'CL=F' },
    fallback: { source: 'fred', options: { series: 'DCOILWTICO' } },
  },
}

export default DCOILWTICO
