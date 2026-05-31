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
      '한국은행 기준금리. 출처: ECOS(722Y001, 항목 0101000, 일별). 기존 FRED OECD 시리즈(IRSTCI01KRM156N/IRSTCB01KRM156N)는 폐기되어 더 이상 존재하지 않아 ECOS로 교체.',
  },
  fetcher: { source: 'ecos', options: { stat: '722Y001', item: '0101000' } },
}

export default KR_BASE_RATE
