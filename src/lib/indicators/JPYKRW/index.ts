import type { IndicatorPlugin } from '../types'

const JPYKRW: IndicatorPlugin = {
  def: {
    id: 'JPYKRW',
    name: 'JPY/KRW (per 100)',
    nameKr: '원/엔 (100엔)',
    category: 'fx',
    unit: 'krw',
    precision: 2,
    thresholds: { normal: [0, 99999], watch: [0, 99999], alert: [0, 99999], direction: 'above' },
    updateCadence: 'daily',
    description: '원/100엔 환율 (ECOS 731Y001 / ITEM 0000002 일본엔, per 100). yfinance 폴백은 per 1 JPY.',
  },
  fetcher: {
    source: 'ecos',
    options: { stat: '731Y001', item: '0000002' },
    fallback: { source: 'yfinance', options: { ticker: 'JPYKRW=X' } },
  },
}

export default JPYKRW
