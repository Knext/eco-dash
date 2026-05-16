import cron from 'node-cron'
import { env } from './env'
import { INDICATORS } from './indicators/definitions'
import { fetchAndStore } from './sources'
import { buildContext, evaluateAll } from './signals/evaluator'
import { classifyRegime } from './signals/regime'

let started = false

export function startLocalCron(): void {
  if (started) return
  started = true

  const expr = env.DATA_REFRESH_CRON
  if (!cron.validate(expr)) {
    console.warn(`[cron] invalid expression: ${expr}, skipping`)
    return
  }
  console.log(`[cron] scheduling daily fetch + evaluate: ${expr}`)
  cron.schedule(expr, async () => {
    console.log('[cron] starting fetch + evaluate')
    try {
      for (const def of INDICATORS) {
        await fetchAndStore(def)
        await new Promise((r) => setTimeout(r, 800))
      }
      const ctx = await buildContext()
      const fired = await evaluateAll(ctx)
      const regime = await classifyRegime(ctx)
      console.log(`[cron] done. fired=${fired.length} regime=${regime.current}`)
    } catch (e) {
      console.error('[cron] error:', e)
    }
  })
}
