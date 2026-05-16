export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  if (process.env.NODE_ENV === 'development' && process.env.DISABLE_CRON !== '1') {
    const { startLocalCron } = await import('./lib/cron')
    startLocalCron()
  }
}
