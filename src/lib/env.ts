import { z } from 'zod'

const envSchema = z.object({
  FRED_API_KEY: z.string().optional(),
  ECOS_API_KEY: z.string().optional(),
  ALPHA_VANTAGE_KEY: z.string().optional(),
  PUBLIC_DATA_API_KEY: z.string().optional(),
  KOSIS_API_KEY: z.string().optional(),
  /**
   * Per-indicator KOSIS table parameters. Format:
   *   "orgId=360&tblId=DT_1R11001_FRM101&itmId=T01&objL1=ALL&prdSe=M&yoy=true"
   * The fetcher parses these as query parameters appended to the KOSIS
   * statisticsParameterData.do endpoint.
   */
  KOSIS_KR_EXPORT_PARAMS: z.string().optional(),
  KOSIS_KR_EXPORT_SEMI_PARAMS: z.string().optional(),
  KOSIS_KR_TB_PARAMS: z.string().optional(),
  DB_PATH: z.string().default('./data/timeseries.db'),
  TURSO_DATABASE_URL: z.string().optional(),
  TURSO_AUTH_TOKEN: z.string().optional(),
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
  KOSIS_API_KEY: process.env.KOSIS_API_KEY,
  KOSIS_KR_EXPORT_PARAMS: process.env.KOSIS_KR_EXPORT_PARAMS,
  KOSIS_KR_EXPORT_SEMI_PARAMS: process.env.KOSIS_KR_EXPORT_SEMI_PARAMS,
  KOSIS_KR_TB_PARAMS: process.env.KOSIS_KR_TB_PARAMS,
  DB_PATH: process.env.DB_PATH,
  TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL,
  TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN,
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
