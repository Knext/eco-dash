import type { IndicatorPlugin } from '../types'

/**
 * KOSPI 주가순자산비율(PBR). KRX(한국거래소)가 발표하는 코스피 종합지수의
 * PBR로, FRED·ECOS·yfinance에는 없어 전용 KRX 소스로 수집한다.
 * (ECOS 901Y014에는 PER·배당수익률만 있고 PBR은 없음.)
 *
 * 밸류에이션 차트 용도라 임계치는 중립(KOSPI·SP500과 동일하게 시그널 미발생)
 * 으로 둔다. PBR ≈ 1배가 청산가치 수준.
 */
const KOSPI_PBR: IndicatorPlugin = {
  def: {
    id: 'KOSPI_PBR',
    name: 'KOSPI PBR',
    nameKr: 'KOSPI PBR',
    category: 'equity',
    unit: 'ratio',
    precision: 2,
    thresholds: { normal: [0, 99999], watch: [0, 99999], alert: [0, 99999], direction: 'above' },
    updateCadence: 'daily',
    description:
      'KOSPI 종합지수 주가순자산비율(PBR). 출처: KRX 시장정보(MDCSTAT00702, 가중 PBR). 1배 미만은 지수 시가총액이 장부상 순자산을 밑도는 수준. 수집에 KRX 로그인(KRX_ID/KRX_PW) 필요.',
  },
  fetcher: {
    source: 'krx',
    options: { indTpCd: '1', indTpCd2: '001', valueKey: 'PBR' },
  },
}

export default KOSPI_PBR
