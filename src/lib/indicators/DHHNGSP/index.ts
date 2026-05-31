import type { IndicatorPlugin } from '../types'

/**
 * 천연가스 (Henry Hub). 단위는 USD/MMBtu라 원유와 가격대가 달라(보통
 * $2~5) 별도 임계치를 둔다.
 */
const DHHNGSP: IndicatorPlugin = {
  def: {
    id: 'DHHNGSP',
    name: 'Natural Gas',
    nameKr: '천연가스',
    category: 'commodity',
    unit: 'usd',
    precision: 2,
    thresholds: { normal: [0, 5], watch: [5, 8], alert: [8, 999], direction: 'above' },
    updateCadence: 'daily',
    description: '천연가스 Henry Hub (NYMEX 선물 NG=F, 폴백 FRED DHHNGSP 현물, USD/MMBtu).',
  },
  fetcher: {
    source: 'yfinance',
    options: { ticker: 'NG=F' },
    fallback: { source: 'fred', options: { series: 'DHHNGSP' } },
  },
}

export default DHHNGSP
