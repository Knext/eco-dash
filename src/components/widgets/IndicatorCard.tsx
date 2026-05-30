'use client'

import type { IndicatorSnapshot } from '@/lib/indicators/types'
import { getPlugin } from '@/lib/indicators/registry'
import { DefaultCard } from '@/components/indicators/_default/Card'

interface Props {
  snapshot: IndicatorSnapshot
  related?: Record<string, IndicatorSnapshot>
}

/**
 * Plugin router for indicator cards. Resolves the per-indicator
 * CardPlugin from the registry; falls back to DefaultCard when the
 * indicator hasn't shipped a custom renderer.
 */
export function IndicatorCard({ snapshot, related }: Props) {
  const plugin = getPlugin(snapshot.id)
  const Render = (plugin?.card?.render ?? DefaultCard) as typeof DefaultCard
  return <Render snapshot={snapshot} related={related} />
}
