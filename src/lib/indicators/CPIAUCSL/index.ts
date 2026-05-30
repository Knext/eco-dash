import type { IndicatorPlugin } from '../types'

const CPIAUCSL: IndicatorPlugin = {
  def: {
    id: 'CPIAUCSL',
    name: 'CPI',
    nameKr: '미국 CPI',
    category: 'inflation',
    unit: 'index',
    precision: 2,
    thresholds: { normal: [0, 3], watch: [3, 4], alert: [4, 999], direction: 'above' },
    updateCadence: 'monthly',
    transform: 'yoy',
    releaseTimeET: '08:30',
    description: '미국 소비자물가지수 YoY %',
  },
  fetcher: { source: 'fred', options: { series: 'CPIAUCSL' } },
}

export default CPIAUCSL
