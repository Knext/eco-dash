import type { IndicatorPlugin } from '../types'

const DGS3: IndicatorPlugin = {
  def: {
    id: 'DGS3',
    name: 'US 3Y',
    nameKr: '미국채 3Y',
    category: 'rates',
    unit: 'pct',
    precision: 2,
    thresholds: { normal: [0, 100], watch: [0, 100], alert: [0, 100], direction: 'above' },
    updateCadence: 'daily',
  },
  fetcher: { source: 'fred', options: { series: 'DGS3' } },
}

export default DGS3
