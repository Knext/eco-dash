import type { IndicatorPlugin } from '../types'

const DGS10: IndicatorPlugin = {
  def: {
    id: 'DGS10',
    name: 'US 10Y',
    nameKr: '미국채 10Y',
    category: 'rates',
    unit: 'pct',
    precision: 2,
    thresholds: { normal: [0, 4.5], watch: [4.5, 5], alert: [5, 999], direction: 'above' },
    updateCadence: 'daily',
    description: '글로벌 할인율의 기준',
    mainView: true,
  },
  fetcher: { source: 'fred', options: { series: 'DGS10' } },
}

export default DGS10
