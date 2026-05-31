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
  // KRX 데이터포털(data.krx.co.kr) 계정. MDCSTAT* 통계 API는 2024년 말부터
  // 로그인을 요구하므로 KRX 소스(KOSPI PBR 등)는 이 자격증명이 있어야 동작한다.
  // 무료 회원가입: https://data.krx.co.kr 우상단 회원가입.
  KRX_ID: z.string().optional(),
  KRX_PW: z.string().optional(),
  DB_PATH: z.string().default('./data/timeseries.db'),
  TURSO_DATABASE_URL: z.string().optional(),
  TURSO_AUTH_TOKEN: z.string().optional(),
  // Optional in the schema so `next build` (which evaluates env at page-data
  // collection without runtime secrets injected — e.g. GitHub Actions CI)
  // doesn't fail. Auth helpers fail-closed when missing, so the cron route
  // still rejects unauthenticated requests in production.
  CRON_SECRET: z
    .string()
    .min(32, 'CRON_SECRET must be at least 32 chars')
    .refine((v) => !v.toLowerCase().startsWith('change-me'), {
      message: 'CRON_SECRET must not use the placeholder default. Generate one with `openssl rand -hex 32`.',
    })
    .optional(),
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
  KRX_ID: process.env.KRX_ID || undefined,
  KRX_PW: process.env.KRX_PW || undefined,
  DB_PATH: process.env.DB_PATH,
  TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL,
  TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN,
  // Treat empty string the same as unset — Vercel sometimes injects empty
  // values for unconfigured secrets, which would otherwise fail .min(32).
  CRON_SECRET: process.env.CRON_SECRET || undefined,
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
export const hasKrx = !!(env.KRX_ID && env.KRX_PW)
