import type { IndicatorPlugin } from '../types'

const KR_BASE_RATE: IndicatorPlugin = {
  def: {
    id: 'KR_BASE_RATE',
    name: 'KR Base Rate',
    nameKr: '한국 기준금리',
    category: 'rates',
    unit: 'pct',
    precision: 2,
    thresholds: { normal: [0, 4], watch: [4, 5], alert: [5, 999], direction: 'above' },
    updateCadence: 'monthly',
    description:
      '한국 콜금리(BOK 기준금리 운영타깃, FRED IRSTCI01KRM156N, 월간). 기존 IRSTCB01KRM156N은 FRED에 존재하지 않아 콜금리로 교체.',
  },
  fetcher: { source: 'fred', options: { series: 'IRSTCI01KRM156N' } },
}

export default KR_BASE_RATE
