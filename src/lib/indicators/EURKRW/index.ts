import type { IndicatorPlugin } from '../types'

const EURKRW: IndicatorPlugin = {
  def: {
    id: 'EURKRW',
    name: 'EUR/KRW',
    nameKr: '원/유로',
    category: 'fx',
    unit: 'krw',
    precision: 2,
    thresholds: { normal: [0, 99999], watch: [0, 99999], alert: [0, 99999], direction: 'above' },
    updateCadence: 'daily',
    description: 'EUR→KRW 환율 (ECOS 731Y001 / ITEM 0000003 유로)',
  },
  fetcher: {
    source: 'ecos',
    options: { stat: '731Y001', item: '0000003' },
    fallback: { source: 'yfinance', options: { ticker: 'EURKRW=X' } },
  },
}

export default EURKRW
