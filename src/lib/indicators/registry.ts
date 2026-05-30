/**
 * Plugin registry — the central source of truth for indicators.
 *
 * Phase 1 wraps the existing `definitions.ts` array as empty
 * `IndicatorPlugin`s (no fetcher/card/detail overrides yet). All call
 * sites should import from here, not from `definitions.ts`, so later
 * phases can move def data into per-indicator folders without
 * touching consumers again.
 */
import { INDICATORS as LEGACY_DEFS } from './definitions'
import type { IndicatorDef, IndicatorPlugin } from './types'

const PLUGINS: readonly IndicatorPlugin[] = LEGACY_DEFS.map((def) => ({ def }))

const PLUGIN_BY_ID = new Map<string, IndicatorPlugin>(
  PLUGINS.map((p) => [p.def.id, p]),
)

/** All registered indicator plugins, in registration order. */
export const INDICATOR_PLUGINS: readonly IndicatorPlugin[] = PLUGINS

/** All indicator definitions, in registration order. */
export const INDICATORS: readonly IndicatorDef[] = PLUGINS.map((p) => p.def)

export function getPlugin(id: string): IndicatorPlugin | undefined {
  return PLUGIN_BY_ID.get(id)
}

export function getIndicator(id: string): IndicatorDef | undefined {
  return PLUGIN_BY_ID.get(id)?.def
}

export const MAIN_VIEW_INDICATORS: readonly string[] = INDICATORS.filter(
  (i) => i.mainView,
).map((i) => i.id)

export const ALL_INDICATOR_IDS: readonly string[] = INDICATORS.map((i) => i.id)
