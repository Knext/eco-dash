import type { IndicatorPlugin } from '../types'

const KR_TB: IndicatorPlugin = {
  def: {
    id: 'KR_TB',
    name: 'KR Trade Balance',
    nameKr: '한국 무역수지',
    category: 'korea',
    unit: 'kbusd',
    precision: 1,
    thresholds: { normal: [0, 999], watch: [-50, 0], alert: [-999, -50], direction: 'below' },
    updateCadence: 'monthly',
    description: '한국 무역수지 (수출-수입). manual entry 권장.',
    inverted: true,
  },
  fetcher: {
    source: 'kosis',
    options: { paramKey: 'TRADE_BALANCE' },
    fallback: { source: 'manual', options: {} },
  },
}

export default KR_TB
