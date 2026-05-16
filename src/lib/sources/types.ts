export interface FetchResult {
  indicatorId: string
  source: string
  rows: Array<{ asOf: string; value: number }>
  success: boolean
  error?: string
  durationMs: number
}

export interface SourceFetcher {
  name: string
  fetch(indicatorId: string, sourceId: string, startDate?: string): Promise<FetchResult>
}
