import type { IndicatorPlugin } from '../types'

const DFF: IndicatorPlugin = {
  def: {
    id: 'DFF',
    name: 'Fed Funds',
    nameKr: 'Fed Funds Rate',
    category: 'rates',
    unit: 'pct',
    precision: 2,
    thresholds: { normal: [0, 5.5], watch: [5.5, 6.5], alert: [6.5, 999], direction: 'above' },
    updateCadence: 'daily',
    description: '미국 정책금리',
  },
  fetcher: { source: 'fred', options: { series: 'DFF' } },
}

export default DFF
