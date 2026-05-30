import type { IndicatorPlugin } from '../types'

const URANIUM: IndicatorPlugin = {
  def: {
    id: 'URANIUM',
    name: 'Uranium (URA ETF)',
    nameKr: '우라늄',
    category: 'commodity',
    unit: 'usd',
    precision: 2,
    thresholds: { normal: [0, 9999], watch: [0, 9999], alert: [0, 9999], direction: 'above' },
    updateCadence: 'daily',
    description: 'Global X Uranium ETF (URA) — uranium 가격 프록시. 우라늄 스팟 직접 시계열 부재로 ETF 대체.',
  },
  fetcher: { source: 'yfinance', options: { ticker: 'URA' } },
}

export default URANIUM
