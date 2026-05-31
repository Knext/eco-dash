import type { IndicatorPlugin } from '../types'

/**
 * KOSPI 주가수익비율(PER). KRX가 발표하는 코스피 종합지수의 가중 PER로,
 * PBR과 같은 MDCSTAT00702 엔드포인트에서 valueKey만 다르게 수집한다.
 * (수집에 KRX 로그인 KRX_ID/KRX_PW 필요 — [[krx-requires-login]].)
 *
 * 밸류에이션 차트 용도라 임계치는 중립(KOSPI·PBR과 동일하게 시그널 미발생).
 */
const KOSPI_PER: IndicatorPlugin = {
  def: {
    id: 'KOSPI_PER',
    name: 'KOSPI PER',
    nameKr: 'KOSPI PER',
    category: 'equity',
    unit: 'ratio',
    precision: 2,
    // 차트 전용(시그널 미발생). 빈 범위([0,0])라 judge()가 항상 'normal' 반환.
    thresholds: { normal: [0, 0], watch: [0, 0], alert: [0, 0], direction: 'above' },
    updateCadence: 'daily',
    description:
      'KOSPI 종합지수 주가수익비율(PER). 출처: KRX 시장정보(MDCSTAT00702, 가중 PER). 이익 대비 지수의 밸류에이션 수준. 수집에 KRX 로그인(KRX_ID/KRX_PW) 필요.',
  },
  fetcher: {
    source: 'krx',
    options: { indTpCd: '1', indTpCd2: '001', valueKey: 'PER' },
  },
}

export default KOSPI_PER
