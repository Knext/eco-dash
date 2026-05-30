import type { IndicatorPlugin } from '../types'

const PPIACO: IndicatorPlugin = {
  def: {
    id: 'PPIACO',
    name: 'PPI',
    nameKr: 'PPI',
    category: 'inflation',
    unit: 'pct',
    precision: 2,
    thresholds: { normal: [0, 2], watch: [2, 4], alert: [4, 999], direction: 'above' },
    updateCadence: 'monthly',
    transform: 'yoy',
    releaseTimeET: '08:30',
    description: '생산자물가지수 YoY %, CPI 1-3M 선행',
  },
  fetcher: { source: 'fred', options: { series: 'PPIACO' } },
}

export default PPIACO
