import type { IndicatorPlugin } from '../types'

const BAMLH0A0HYM2: IndicatorPlugin = {
  def: {
    id: 'BAMLH0A0HYM2',
    name: 'HY OAS',
    nameKr: 'HY 스프레드',
    category: 'credit',
    unit: 'pct',
    precision: 2,
    thresholds: { normal: [0, 5], watch: [5, 7], alert: [7, 999], direction: 'above' },
    updateCadence: 'daily',
    description: '하이일드 스프레드, 주식 1-3M 선행',
    mainView: true,
  },
  fetcher: { source: 'fred', options: { series: 'BAMLH0A0HYM2' } },
}

export default BAMLH0A0HYM2
