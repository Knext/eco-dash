import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(value: number, precision: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(value)
}

export function formatBp(bps: number): string {
  return `${Math.round(bps)} bp`
}

export function formatPct(pct: number, precision = 2): string {
  const sign = pct >= 0 ? '+' : ''
  return `${sign}${pct.toFixed(precision)}%`
}

export function pctChange(current: number, prev: number): number {
  if (prev === 0) return 0
  return ((current - prev) / Math.abs(prev)) * 100
}
