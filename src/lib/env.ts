import { z } from 'zod'

const envSchema = z.object({
  FRED_API_KEY: z.string().optional(),
  ECOS_API_KEY: z.string().optional(),
  ALPHA_VANTAGE_KEY: z.string().optional(),
  PUBLIC_DATA_API_KEY: z.string().optional(),
  DB_PATH: z.string().default('./data/timeseries.db'),
  CRON_SECRET: z
    .string()
    .min(32, 'CRON_SECRET must be at least 32 chars')
    .refine((v) => !v.toLowerCase().startsWith('change-me'), {
      message: 'CRON_SECRET must not use the placeholder default. Generate one with `openssl rand -hex 32`.',
    }),
  DATA_REFRESH_CRON: z.string().default('0 0 * * *'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  TZ: z.string().default('Asia/Seoul'),
  NEXT_PUBLIC_BASE_URL: z.string().default('http://localhost:3000'),
  NEXT_PUBLIC_DEFAULT_THEME: z.enum(['system', 'light', 'dark']).default('system'),
})

export type Env = z.infer<typeof envSchema>

const parseResult = envSchema.safeParse({
  FRED_API_KEY: process.env.FRED_API_KEY,
  ECOS_API_KEY: process.env.ECOS_API_KEY,
  ALPHA_VANTAGE_KEY: process.env.ALPHA_VANTAGE_KEY,
  PUBLIC_DATA_API_KEY: process.env.PUBLIC_DATA_API_KEY,
  DB_PATH: process.env.DB_PATH,
  CRON_SECRET: process.env.CRON_SECRET,
  DATA_REFRESH_CRON: process.env.DATA_REFRESH_CRON,
  LOG_LEVEL: process.env.LOG_LEVEL,
  TZ: process.env.TZ,
  NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
  NEXT_PUBLIC_DEFAULT_THEME: process.env.NEXT_PUBLIC_DEFAULT_THEME,
})

if (!parseResult.success) {
  const issues = parseResult.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n')
  throw new Error(
    `[env] Invalid environment configuration:\n${issues}\n\n` +
      `Set required variables in .env.local. See .env.example.`,
  )
}

export const env: Env = parseResult.data

export const hasFred = !!env.FRED_API_KEY
export const hasEcos = !!env.ECOS_API_KEY
