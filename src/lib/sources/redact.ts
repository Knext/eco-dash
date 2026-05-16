import { env } from '../env'

const SECRETS: string[] = [
  env.FRED_API_KEY ?? '',
  env.ECOS_API_KEY ?? '',
  env.ALPHA_VANTAGE_KEY ?? '',
  env.PUBLIC_DATA_API_KEY ?? '',
  env.CRON_SECRET,
].filter((s): s is string => typeof s === 'string' && s.length >= 8)

export function redact(message: string): string {
  let out = message
  for (const s of SECRETS) {
    if (!s) continue
    out = out.split(s).join('***REDACTED***')
  }
  return out
}

export function safeFinite(raw: string): number | null {
  if (raw === '' || raw === 'null' || raw === 'NaN' || raw === '.') return null
  const v = parseFloat(raw)
  if (!Number.isFinite(v)) return null
  if (Math.abs(v) > 1e12) return null
  return v
}
