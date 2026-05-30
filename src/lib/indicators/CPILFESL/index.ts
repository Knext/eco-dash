import type { IndicatorPlugin } from '../types'

const CPILFESL: IndicatorPlugin = {
  def: {
    id: 'CPILFESL',
    name: 'Core CPI',
    nameKr: '미국 근원 CPI',
    category: 'inflation',
    unit: 'pct',
    precision: 2,
    thresholds: { normal: [0, 2.5], watch: [2.5, 4], alert: [4, 999], direction: 'above' },
    updateCadence: 'monthly',
    transform: 'yoy',
    releaseTimeET: '08:30',
    description: 'Core CPI YoY % (식품·에너지 제외), Fed 정책 타깃',
    mainView: true,
  },
  fetcher: { source: 'fred', options: { series: 'CPILFESL' } },
}

export default CPILFESL
