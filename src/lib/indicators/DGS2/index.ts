import type { IndicatorPlugin } from '../types'

const DGS2: IndicatorPlugin = {
  def: {
    id: 'DGS2',
    name: 'US 2Y',
    nameKr: '미국채 2Y',
    category: 'rates',
    unit: 'pct',
    precision: 2,
    thresholds: { normal: [0, 100], watch: [0, 100], alert: [0, 100], direction: 'above' },
    updateCadence: 'daily',
    hidden: true,
  },
  fetcher: { source: 'fred', options: { series: 'DGS2' } },
}

export default DGS2
