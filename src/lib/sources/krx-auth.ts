import { env } from '../env'

/**
 * KRX 데이터포털 로그인 세션 관리. pykrx의 `pykrx/website/comm/auth.py`를
 * 최소 포팅한 것. MDCSTAT* 통계 API는 2024년 말부터 로그인을 요구하므로,
 * KRX 소스는 인증된 쿠키(JSESSIONID 등) 없이는 "LOGOUT" 400을 받는다.
 *
 * Node fetch에는 쿠키 저장소가 없으므로 set-cookie를 직접 수집·병합해
 * 한 시간 동안 캐싱한다. KRX_ID/KRX_PW가 없으면 인증 불가로 명확히 실패한다.
 */
const BASE = 'https://data.krx.co.kr'
const LOGIN_PAGE = `${BASE}/contents/MDC/COMS/client/MDCCOMS001.cmd`
const LOGIN_JSP = `${BASE}/contents/MDC/COMS/client/view/login.jsp?site=mdc`
const LOGIN_URL = `${BASE}/contents/MDC/COMS/client/MDCCOMS001D1.cmd`
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

const SESSION_TTL_MS = 55 * 60 * 1000 // pykrx와 동일하게 ~1시간, 여유분 5분

interface CachedSession {
  readonly cookie: string
  readonly expiresAt: number
}

let cached: CachedSession | null = null

/** 인증 실패를 호출부에서 구분할 수 있도록 별도 에러 타입 사용. */
export class KrxAuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'KrxAuthError'
  }
}

/**
 * 인증된 KRX 쿠키 문자열을 반환한다. 캐시가 유효하면 재사용하고,
 * 아니면 로그인한다. KRX_ID/KRX_PW 미설정 시 KrxAuthError를 던진다.
 */
export async function getKrxCookie(): Promise<string> {
  if (cached && Date.now() < cached.expiresAt) return cached.cookie

  const id = env.KRX_ID
  const pw = env.KRX_PW
  if (!id || !pw) {
    throw new KrxAuthError(
      'KRX_ID/KRX_PW가 설정되지 않았습니다. MDCSTAT 통계 API는 로그인을 요구합니다. ' +
        'https://data.krx.co.kr 에서 무료 가입 후 .env.local에 KRX_ID/KRX_PW를 설정하세요.',
    )
  }

  const cookie = await login(id, pw)
  cached = { cookie, expiresAt: Date.now() + SESSION_TTL_MS }
  return cookie
}

/** 테스트/오류 복구용 — 캐시된 세션을 비운다. */
export function clearKrxSession(): void {
  cached = null
}

/**
 * 로그인 흐름(pykrx login_krx 포팅):
 *   1. GET MDCCOMS001.cmd  → 초기 JSESSIONID
 *   2. GET login.jsp       → iframe 세션 초기화
 *   3. POST MDCCOMS001D1.cmd → 실제 로그인 (CD001=성공)
 *   4. CD011(중복 로그인) → skipDup=Y 재전송
 */
async function login(id: string, pw: string): Promise<string> {
  const jar = new Map<string, string>()

  await getAndCollect(LOGIN_PAGE, jar, { 'User-Agent': USER_AGENT })
  await getAndCollect(LOGIN_JSP, jar, { 'User-Agent': USER_AGENT, Referer: LOGIN_PAGE })

  const basePayload = { mbrNm: '', telNo: '', di: '', certType: '', mbrId: id, pw }
  let data = await postLogin(basePayload, jar)

  if (data._error_code === 'CD011') {
    data = await postLogin({ ...basePayload, skipDup: 'Y' }, jar)
  }

  if (data._error_code !== 'CD001') {
    throw new KrxAuthError(
      `KRX 로그인 실패 (${data._error_code || 'unknown'}): ${data._error_message || '자격증명을 확인하세요'}`,
    )
  }

  const cookie = serializeCookies(jar)
  if (!cookie.includes('JSESSIONID')) {
    throw new KrxAuthError('KRX 로그인 응답에 세션 쿠키(JSESSIONID)가 없습니다.')
  }
  return cookie
}

interface LoginResponse {
  _error_code?: string
  _error_message?: string
}

async function postLogin(
  payload: Record<string, string>,
  jar: Map<string, string>,
): Promise<LoginResponse> {
  const res = await fetch(LOGIN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'User-Agent': USER_AGENT,
      Referer: LOGIN_PAGE,
      Cookie: serializeCookies(jar),
    },
    body: new URLSearchParams(payload).toString(),
  })
  collectSetCookies(res, jar)
  if (!res.ok) throw new KrxAuthError(`KRX 로그인 HTTP ${res.status}`)
  return (await res.json()) as LoginResponse
}

async function getAndCollect(
  url: string,
  jar: Map<string, string>,
  headers: Record<string, string>,
): Promise<void> {
  const res = await fetch(url, {
    headers: { ...headers, Cookie: serializeCookies(jar) },
  })
  collectSetCookies(res, jar)
}

/** set-cookie 헤더에서 name=value만 추출해 jar에 병합(불변적으로 갱신). */
function collectSetCookies(res: Response, jar: Map<string, string>): void {
  const setCookies = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : []
  for (const raw of setCookies) {
    const first = raw.split(';')[0] ?? ''
    const eq = first.indexOf('=')
    if (eq <= 0) continue
    const name = first.slice(0, eq).trim()
    const value = first.slice(eq + 1).trim()
    if (name) jar.set(name, value)
  }
}

function serializeCookies(jar: Map<string, string>): string {
  return Array.from(jar.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join('; ')
}

export const KRX_USER_AGENT = USER_AGENT
