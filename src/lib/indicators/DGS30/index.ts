import type { IndicatorPlugin } from '../types'

const DGS30: IndicatorPlugin = {
  def: {
    id: 'DGS30',
    name: 'US 30Y',
    nameKr: '미국채 30Y',
    category: 'rates',
    unit: 'pct',
    precision: 2,
    thresholds: { normal: [0, 5], watch: [5, 5.5], alert: [5.5, 999], direction: 'above' },
    updateCadence: 'daily',
  },
  fetcher: { source: 'fred', options: { series: 'DGS30' } },
}

export default DGS30
