import { getManualOverrides } from '../db/queries'
import type { FetchResult, SourceFetcher } from './types'

/**
 * Manual data source: reads from `manual_overrides` table.
 * Use `scripts/manual-entry.ts` or POST to /api/manual to populate.
 *
 * Best fit for low-frequency monthly data with no free API (e.g. Korea exports).
 */
export const manualFetcher: SourceFetcher = {
  name: 'manual',
  async fetch(indicatorId): Promise<FetchResult> {
    const start = Date.now()
    const rows = getManualOverrides(indicatorId)
    if (rows.length === 0) {
      return {
        indicatorId,
        source: 'manual',
        rows: [],
        success: false,
        error: `no manual_overrides for ${indicatorId}. Populate via: npm run manual-entry -- ${indicatorId} <YYYY-MM-DD> <value>`,
        durationMs: Date.now() - start,
      }
    }
    return {
      indicatorId,
      source: 'manual',
      rows: rows.map((r) => ({ asOf: r.as_of, value: r.value })),
      success: true,
      durationMs: Date.now() - start,
    }
  },
}
