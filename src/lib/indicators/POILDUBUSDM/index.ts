import type { IndicatorPlugin } from '../types'

/**
 * 두바이유. 일별 무료 소스가 없어 FRED POILDUBUSDM(IMF Global price of
 * Dubai Crude, 월간)을 사용한다. 월간 데이터라 발표가 1~2개월 지연될 수
 * 있어 갱신 사이에는 stale로 표시될 수 있다.
 */
const POILDUBUSDM: IndicatorPlugin = {
  def: {
    id: 'POILDUBUSDM',
    name: 'Dubai',
    nameKr: '두바이유',
    category: 'commodity',
    unit: 'usd',
    precision: 2,
    thresholds: { normal: [50, 90], watch: [90, 110], alert: [110, 999], direction: 'above' },
    updateCadence: 'monthly',
    description: '두바이유 (FRED POILDUBUSDM, IMF 월간 글로벌 가격).',
  },
  fetcher: {
    source: 'fred',
    options: { series: 'POILDUBUSDM' },
  },
}

export default POILDUBUSDM
