# Economy Dashboard

거시지표 기반 투자 판단 대시보드. 23개 지표를 한 화면에 모니터링하고, 17개 룰 + 5개 거시 레짐으로 매수/매도 시그널을 평가합니다.

- 설계 문서: [`INVESTMENT_DASHBOARD_DESIGN.md`](./INVESTMENT_DASHBOARD_DESIGN.md)
- 운영 가정: 한국 개인 투자자, 중기 시간축(수개월~1년), 한국+미국+글로벌 자산군, 인앱 알림만, 로컬/개인 서버

## 빠른 시작

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정
cp .env.example .env.local
#  - FRED_API_KEY, ECOS_API_KEY 입력 (둘 다 무료)
#  - CRON_SECRET: openssl rand -hex 32 결과를 붙여 넣기
#    (32자 이상 필수, "change-me"로 시작 불가)

# 3. 초기 5년 백필 (약 1~2분)
npm run backfill

# 4. 한국 수출 데이터는 manual entry로 입력
npm run manual-entry -- KR_EXPORT 2026-05-01 5.2 "산자부 5월"
npm run manual-entry -- KR_EXPORT_SEMI 2026-05-01 18.3
npm run manual-entry -- KR_TB 2026-05-01 4.5

# 5. 시그널 평가
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/evaluate

# 6. 개발 서버
npm run dev
# 브라우저: http://localhost:3000
```

## API 키 발급 가이드

| 소스 | 필수? | 발급 |
|------|------|------|
| FRED | 필수 | https://fred.stlouisfed.org/docs/api/api_key.html (이메일 등록 즉시) |
| ECOS (한국은행) | 필수 | https://ecos.bok.or.kr/api/ (즉시) |
| data.go.kr 공공데이터포털 | 선택 (KITA 관세청 통계용) | https://www.data.go.kr/ (신청 후 1~2일) |
| Alpha Vantage | 선택 (시장 데이터 폴백) | https://www.alphavantage.co/support/#api-key |

`CRON_SECRET`는 별도 발급 없이 직접 생성:
```bash
openssl rand -hex 32
```

## 데이터 소스 매핑

23개 지표 중 18개는 무료 API로 자동 갱신, 나머지는 manual 입력 또는 폴백 체인을 거칩니다.

| 소스 | 카테고리 | 비고 |
|------|---------|------|
| FRED | 미국 매크로, 금리, 스프레드, DXY, WTI, CPI/PPI | 1차 소스, 120 req/min 무료 |
| ECOS | USD/KRW, 한국 기준금리 | 1차 소스, 10K req/day 무료 |
| yfinance v8 chart API | KOSPI, S&P 500, MOVE, Gold (GC=F) | 비공식 (v7 download는 2024년 차단) |
| Stooq | yfinance 폴백 (CSV) | 비공식 |
| KITA / 관세청 | 한국 수출입 (선택) | `PUBLIC_DATA_API_KEY` 있을 때만 |
| **manual** | KR_EXPORT, KR_EXPORT_SEMI, KR_TB, MOVE 폴백 | `manual_overrides` 테이블, CLI로 입력 |

## 한국 수출 데이터 입력

산자부가 **매월 1일 09:00 KST**에 전월 수출입 잠정치를 발표합니다. 발표 후 다음 명령어로 입력:

```bash
# 형식: <indicator> <YYYY-MM-DD> <value> [note]
npm run manual-entry -- KR_EXPORT      2026-05-01 5.2 "산자부 5월 잠정"
npm run manual-entry -- KR_EXPORT_SEMI 2026-05-01 18.3
npm run manual-entry -- KR_TB          2026-05-01 4.5

# 입력값 확인
npm run manual-entry -- --list KR_EXPORT

# 잘못 입력한 값 삭제
npm run manual-entry -- --delete KR_EXPORT 2026-05-01

# 도움말
npm run manual-entry -- --help
```

값 단위:
- `KR_EXPORT`, `KR_EXPORT_SEMI`: YoY % (예: `5.2` = +5.2%, `-7.3` = -7.3%)
- `KR_TB`: 십억 USD (예: `4.5` = $4.5B)

## 주요 명령어

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 개발 서버 (자동 cron 등록, KST 09:00 fetch) |
| `npm run build` | 프로덕션 빌드 |
| `npm start` | 프로덕션 서버 |
| `npm test` | Vitest 단위 테스트 (30개) |
| `npm run typecheck` | TypeScript strict 검사 |
| `npm run backfill` | 5년 히스토리 일괄 수집 |
| `npm run manual-entry -- ...` | 한국 수출 등 수동 입력 |
| `npm run healthcheck` | API 키 / DB / fetch_log 상태 점검 |
| `npm run migrate` | DB 스키마 적용 확인 |

## 디렉토리 구조

```
src/
├── app/                      # Next.js App Router (페이지 + API 라우트)
│   ├── page.tsx              # 메인 대시보드
│   ├── indicator/[id]/       # 개별 지표 드릴다운
│   ├── alerts/               # 알림 히스토리
│   └── api/
│       ├── indicators/       # 지표 데이터 API
│       ├── alerts/           # 활성/과거 알림
│       ├── regime/           # 현재 레짐
│       ├── releases/         # 발표 일정
│       └── cron/             # 데이터 수집·시그널 평가 (Bearer 인증)
├── lib/
│   ├── auth.ts               # checkBearer / checkOrigin
│   ├── env.ts                # Zod 환경변수 검증 (런타임 throw)
│   ├── timezone.ts           # KST/ET 변환
│   ├── cron.ts               # node-cron 등록
│   ├── db/                   # SQLite 스키마·쿼리
│   ├── sources/              # FRED / ECOS / yfinance / Stooq / KITA / manual
│   │   └── redact.ts         # API 키 마스킹 + Number.isFinite
│   ├── indicators/           # 24개 IndicatorDef + 정규화 + 임계치
│   └── signals/              # 17개 룰 + 레짐 + hysteresis evaluator
├── components/
│   ├── widgets/              # IndicatorCard, AlertBanner, AlertFeed 등 10종
│   ├── dashboard/            # Header, DashboardGrid
│   └── providers/            # ReactQueryProvider
└── instrumentation.ts        # 서버 부팅 시 cron 자동 등록
```

## 보안 / 운영

- **CRON_SECRET 필수**: 32자 이상, `change-me` 시작 금지. `npm run build` / 런타임에 미충족 시 throw.
- **cron 엔드포인트**: 모든 메서드(GET/POST)에 `Authorization: Bearer ${CRON_SECRET}` 필수. `crypto.timingSafeEqual` 사용.
- **`/api/alerts` POST**: `Origin` 헤더가 `NEXT_PUBLIC_BASE_URL`과 일치할 때만 (CSRF 보호).
- **API 키 마스킹**: fetcher 에러 메시지에서 `FRED_API_KEY`, `ECOS_API_KEY` 등은 `***REDACTED***`로 자동 치환.
- **데이터 검증**: 모든 외부 응답은 `Number.isFinite` 통과 (NaN/Infinity 차단) + ISO 날짜 정규식 검증.

## 시그널 엔진 핵심 동작

- **Cooldown 168h / 720h**: 룰별로 1주~30일 노이즈 억제.
- **Escalation 예외**: 같은 룰이라도 `warning → critical`은 즉시 재발화.
- **Hysteresis**: 3회 연속 미충족일 때만 알림 resolve (oscillation 방지).
- **Calendar-based YoY/sustained**: 결측 허용 ±15일 매칭, 거래일이 아닌 캘린더 일수 기준.
- **CONFLICT 처리**: 매수 critical(보라) + 매도 critical(빨강) 동시 발화 시 자동 결론 없이 양쪽 병기.

## 트러블슈팅

### `Error: [env] Invalid environment configuration: CRON_SECRET: Required`
`.env.local`에 `CRON_SECRET=`이 설정되지 않았거나 32자 미만. `openssl rand -hex 32`로 생성해 입력.

### `yfinance HTTP 401`
Yahoo가 v7 download 엔드포인트를 차단했지만 v8 chart API는 작동합니다. fetcher가 자동으로 v8을 사용하므로 401이 나오면 일시 장애로 보고 다음 cron까지 대기.

### `KR_EXPORT: no manual_overrides for ...`
산자부 발표 후 `npm run manual-entry -- KR_EXPORT YYYY-MM-DD <YoY%>`로 입력하면 다음 fetch부터 정상 노출.

### KOSPI 카드가 stale 표시
yfinance v8 또는 Stooq 폴백이 모두 실패하면 발생. `npm run healthcheck`로 fetch_log 확인 후 수동으로 `manual-entry`에 추가 가능 (단 지수 단위 입력 필요).

## 배포

GitHub Actions로 Vercel에 자동 배포합니다. 자세한 설정은 [`docs/DEPLOY_VERCEL.md`](./docs/DEPLOY_VERCEL.md) 참조.

요약:
- `main` push → 프로덕션 배포
- PR → preview URL을 PR에 코멘트
- Vercel Cron이 매일 자정 KST에 `/api/cron/fetch` + `/api/cron/evaluate`를 자동 호출
- 필요한 GitHub Secrets: `VERCEL_TOKEN`, `CRON_SECRET`
- 필요한 Vercel 환경변수: `FRED_API_KEY`, `ECOS_API_KEY`, `CRON_SECRET`, `NEXT_PUBLIC_BASE_URL`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`

**DB**: 로컬은 `./data/timeseries.db` (SQLite 파일), Vercel은 **Turso (libSQL, SQLite 호환)** 매니지드 DB. `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN`이 설정되면 자동 전환. 자세한 셋업은 [`docs/DEPLOY_VERCEL.md`](./docs/DEPLOY_VERCEL.md)의 Turso 섹션 참조.

## 비용

| 항목 | 비용 |
|------|------|
| 서버 (로컬 / Vercel Hobby) | $0 |
| DB (로컬 SQLite / Turso 무료) | $0 |
| FRED / ECOS / data.go.kr API | $0 |
| 도메인 (선택) | $10/년 |
| **합계** | **$0~$10/년** |

## 라이선스 / 면책

개인 사용 목적. 외부 데이터 소스의 ToS 준수 필요 (특히 yfinance/Stooq는 비공식 API). 매수/매도 시그널은 매크로 거시 판단 보조용이며, **자동 매매 트리거가 아닙니다**. 모든 알림은 "검토" 수준의 행동 힌트만 제공합니다.
