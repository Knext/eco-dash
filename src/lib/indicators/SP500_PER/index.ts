import type { IndicatorPlugin } from '../types'

/**
 * S&P 500 주가수익비율(PER). 출처: multpl.com(trailing 12M 'as reported'
 * earnings 기준, 월간). FRED/yfinance에 S&P 500 PER 시계열이 없어 전용
 * multpl 소스로 수집한다. 차트 전용이라 임계치는 중립.
 */
const SP500_PER: IndicatorPlugin = {
  def: {
    id: 'SP500_PER',
    name: 'S&P 500 PER',
    nameKr: 'S&P 500 PER',
    category: 'equity',
    unit: 'ratio',
    precision: 2,
    // 차트 전용(시그널 미발생). 빈 범위([0,0])라 judge()가 항상 'normal' 반환.
    thresholds: { normal: [0, 0], watch: [0, 0], alert: [0, 0], direction: 'above' },
    updateCadence: 'monthly',
    description:
      'S&P 500 주가수익비율(PER). 출처: multpl.com(trailing 12개월 as-reported 이익 기준, 월간).',
  },
  fetcher: {
    source: 'multpl',
    options: { metric: 'pe' },
  },
}

export default SP500_PER
