import type { IndicatorPlugin } from '../types'

const DGS3MO: IndicatorPlugin = {
  def: {
    id: 'DGS3MO',
    name: 'US 3M',
    nameKr: '미국채 3M',
    category: 'rates',
    unit: 'pct',
    precision: 2,
    thresholds: { normal: [0, 100], watch: [0, 100], alert: [0, 100], direction: 'above' },
    updateCadence: 'daily',
    hidden: true,
  },
  fetcher: { source: 'fred', options: { series: 'DGS3MO' } },
}

export default DGS3MO
