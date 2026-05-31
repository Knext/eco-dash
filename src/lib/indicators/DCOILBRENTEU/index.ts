import type { IndicatorPlugin } from '../types'

const DCOILBRENTEU: IndicatorPlugin = {
  def: {
    id: 'DCOILBRENTEU',
    name: 'Brent',
    nameKr: '브렌트유',
    category: 'commodity',
    unit: 'usd',
    precision: 2,
    thresholds: { normal: [50, 90], watch: [90, 110], alert: [110, 999], direction: 'above' },
    updateCadence: 'daily',
    description: '브렌트유 (ICE Brent 선물 BZ=F, 폴백 FRED DCOILBRENTEU 현물).',
  },
  fetcher: {
    source: 'yfinance',
    options: { ticker: 'BZ=F' },
    fallback: { source: 'fred', options: { series: 'DCOILBRENTEU' } },
  },
}

export default DCOILBRENTEU
