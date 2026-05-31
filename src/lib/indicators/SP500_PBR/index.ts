import type { IndicatorPlugin } from '../types'

/**
 * S&P 500 주가순자산비율(PBR, Price to Book). 출처: multpl.com(분기).
 * FRED/yfinance에 S&P 500 PBR 시계열이 없어 전용 multpl 소스로 수집한다.
 * 분기 데이터지만 최신 분기는 현재값 추정치가 갱신된다. 차트 전용이라 중립.
 */
const SP500_PBR: IndicatorPlugin = {
  def: {
    id: 'SP500_PBR',
    name: 'S&P 500 PBR',
    nameKr: 'S&P 500 PBR',
    category: 'equity',
    unit: 'ratio',
    precision: 2,
    // 차트 전용(시그널 미발생). 빈 범위([0,0])라 judge()가 항상 'normal' 반환.
    thresholds: { normal: [0, 0], watch: [0, 0], alert: [0, 0], direction: 'above' },
    updateCadence: 'monthly',
    description:
      'S&P 500 주가순자산비율(PBR, Price to Book). 출처: multpl.com(분기 데이터).',
  },
  fetcher: {
    source: 'multpl',
    options: { metric: 'pb' },
  },
}

export default SP500_PBR
