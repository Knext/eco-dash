import type { IndicatorPlugin } from '../types'

const MOVE: IndicatorPlugin = {
  def: {
    id: 'MOVE',
    name: 'MOVE Index',
    nameKr: 'MOVE 지수',
    category: 'volatility',
    unit: 'index',
    precision: 1,
    thresholds: { normal: [0, 100], watch: [100, 150], alert: [150, 999], direction: 'above' },
    updateCadence: 'daily',
    description: '미국채 옵션 변동성 지수 (채권 VIX). yfinance 차단 시 manual entry.',
  },
  fetcher: {
    source: 'yfinance',
    options: { ticker: '^MOVE' },
    fallback: { source: 'manual', options: {} },
  },
}

export default MOVE
