import type { IndicatorPlugin } from '../types'

const USDKRW: IndicatorPlugin = {
  def: {
    id: 'USDKRW',
    name: 'USD/KRW',
    nameKr: '원/달러',
    category: 'fx',
    unit: 'krw',
    precision: 2,
    thresholds: { normal: [1100, 1300], watch: [1300, 1400], alert: [1400, 9999], direction: 'above' },
    updateCadence: 'daily',
    description: '한국 투자자 환 익스포저 (ECOS 731Y001 / ITEM 0000001 미국달러)',
  },
  fetcher: {
    source: 'ecos',
    options: { stat: '731Y001', item: '0000001' },
    fallback: { source: 'yfinance', options: { ticker: 'KRW=X' } },
  },
}

export default USDKRW
