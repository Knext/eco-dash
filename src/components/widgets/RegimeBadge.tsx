import { cn } from '@/lib/utils'
import { daysSince } from '@/lib/timezone'
import type { Regime } from '@/lib/signals/types'

const REGIME_CONFIG: Record<Regime, { label: string; bg: string; text: string; description: string }> = {
  goldilocks: {
    label: 'Goldilocks',
    bg: 'bg-emerald-100 dark:bg-emerald-900/40',
    text: 'text-emerald-800 dark:text-emerald-200',
    description: '성장↑ 인플레↓',
  },
  risk_on: {
    label: 'Risk-On',
    bg: 'bg-green-100 dark:bg-green-900/40',
    text: 'text-green-800 dark:text-green-200',
    description: '위험자산 우호',
  },
  risk_off: {
    label: 'Risk-Off',
    bg: 'bg-amber-100 dark:bg-amber-900/40',
    text: 'text-amber-800 dark:text-amber-200',
    description: '방어 모드',
  },
  stagflation: {
    label: 'Stagflation',
    bg: 'bg-orange-100 dark:bg-orange-900/40',
    text: 'text-orange-800 dark:text-orange-200',
    description: '인플레↑ 성장↓',
  },
  recession: {
    label: 'Recession',
    bg: 'bg-red-100 dark:bg-red-900/40',
    text: 'text-red-800 dark:text-red-200',
    description: '침체 진행',
  },
}

interface Props {
  regime: Regime
  enteredAt: string
  previous?: Regime | null
  triggerSummary?: string
}

export function RegimeBadge({ regime, enteredAt, previous, triggerSummary }: Props) {
  const cfg = REGIME_CONFIG[regime]
  const days = daysSince(enteredAt)
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-caption-md font-semibold',
          cfg.bg,
          cfg.text,
        )}
      >
        {cfg.label}
        <span className="text-[10px] tabular opacity-70">D+{days}</span>
      </div>
      <div className="hidden flex-col text-caption-sm text-mute sm:flex">
        <span>{cfg.description}</span>
        {previous && previous !== regime && (
          <span className="opacity-70">직전: {REGIME_CONFIG[previous].label}</span>
        )}
      </div>
      {triggerSummary && (
        <div className="hidden max-w-xs truncate text-caption-sm text-mute md:block">
          {triggerSummary}
        </div>
      )}
    </div>
  )
}
