import type { IndicatorPlugin } from '../types'

const KR_10Y: IndicatorPlugin = {
  def: {
    id: 'KR_10Y',
    name: 'KR 10Y',
    nameKr: '한국채 10Y',
    category: 'rates',
    unit: 'pct',
    precision: 2,
    thresholds: { normal: [0, 4], watch: [4, 5], alert: [5, 999], direction: 'above' },
    updateCadence: 'monthly',
    description: '한국 10년 국고채 수익률 (FRED IRLTLT01KRM156N, 월간)',
  },
  fetcher: { source: 'fred', options: { series: 'IRLTLT01KRM156N' } },
}

export default KR_10Y
