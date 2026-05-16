# 기술 아키텍처 (Phase 5)

작성일: 2026-05-16
담당: dashboard-tech-architect
대상 인계물: Phase 0 사용자 brief, Phase 2 데이터 소스 매핑(24개 지표), Phase 3 시그널 룰(17개) + 레짐(5개), Phase 4 UX 설계(위젯 10종, 색상 토큰, 반응형)

---

## 0. 요약

- **권장 스택 한 줄**: Next.js 14 App Router + TypeScript + Tailwind/shadcn + better-sqlite3 + TanStack Query, **로컬 단일 사용자 풀스택**.
- **비용 추정**: 로컬 모드 $0/년, Vercel Hobby + Turso 무료 티어 $0/년. 도메인은 선택($10/년). 총 **$0~$10/년**.
- **구현 기간**: 4주 (Week 1 셋업 + 핵심 5지표, Week 2 한국 + 시그널 피드, Week 3 복합 룰/레짐, Week 4 반응형 + 마무리).
- **핵심 선택 이유**: 24개 지표 × 일별 갱신 × 단일 사용자 = SQLite로 충분. Streamlit은 UX/색상 토큰 자유도 부족, FastAPI 분리는 트래픽 대비 과설계. Next.js 단일 프로세스로 cron·API·UI 동거가 가장 단순.

---

## 1. 스택 옵션 비교

| 트랙 | 스택 | 셋업 시간 | 확장성 | 비용 | 권장? |
|------|------|---------|------|------|------|
| **PoC** | Streamlit + Python + DuckDB | 1~2일 | 낮음 (UI 자유도, 동시접속 약함) | $0 | △ — 초기 데이터 검증용으로는 OK, 본 프로젝트 UX 토큰(매도/매수 색상 분리, 펄스 애니메이션, sticky 배너) 구현이 까다로워 본격 채택 비추 |
| **풀스택 (권장)** | Next.js 14 + TS + Tailwind + shadcn/ui + better-sqlite3 + node-cron | 1~2주 | 높음 (Vercel/로컬 양쪽 가능, 추후 모바일 PWA) | $0~$10 | ★ — UX 색상 토큰/펄스/sticky 배너/반응형 모두 자연스럽게 구현. SQLite로 단일 사용자 충분, 추후 Postgres 마이그레이션 경로 보장 |
| **하이브리드** | Next.js 프론트 + FastAPI 백엔드 + Postgres | 2~3주 | 매우 높음 (ML 통합·다중 사용자 확장) | $0~$20 | × — 본 프로젝트는 ML/백테스트 무거운 계산 없음. 데이터 24개·룰 17개는 TypeScript로 충분. 인프라 2개 관리 오버헤드 불필요 |

**결론**: 풀스택 트랙 채택. PoC 트랙은 Week 1 FRED fetcher 검증 단계에서 1일 정도 활용 가능하나 본 문서는 풀스택 기준으로 작성.

---

## 2. 권장 스택 (풀스택 트랙)

| 영역 | 선택 | 근거 |
|------|------|------|
| 프레임워크 | **Next.js 14 (App Router)** | 단일 프로세스로 cron·API·UI 동거. RSC로 초기 페이로드 최소. Vercel 배포 옵션 보존 |
| 언어 | **TypeScript 5.x (strict)** | 24개 지표 + 17개 룰의 타입 안전성. `IndicatorDef`, `Signal`, `RegimeState` 등 도메인 타입 강제 |
| 스타일 | **Tailwind CSS + shadcn/ui** | Phase 4 색상 토큰(severity/regime)을 `tailwind.config.ts`에 그대로 매핑. shadcn은 카드/배지/툴팁만 선택 차용 |
| 데이터 페치 | **TanStack Query** | 5분 polling, stale-while-revalidate, 캐시 무효화. 인증 없음이라 query key가 단순 |
| 검증 | **Zod** | FRED/ECOS 응답 스키마 검증 + 환경변수 검증 + 시그널 룰 JSON 검증 |
| 차트 | **Recharts** | 스파크라인·멀티라인·SpreadChart(영역 부호 분리)·DualAxis 모두 커버. 번들 크기 적절(~80KB) |
| DB | **better-sqlite3 (동기 API)** | 단일 사용자 + node.js 임베디드. 트랜잭션 동기 호출이 cron에서 단순 |
| 스케줄러 | **node-cron (로컬) / Vercel Cron (배포)** | 로컬 모드 기본. 배포 시 Vercel Cron(일 2회 무료)으로 전환 |
| 알림 | **인앱만** — DB `signals` 테이블 + 프론트 polling | 외부 채널(Slack/Email/Push) 미구현. 사용자 brief 준수 |
| 인증 | **없음** | 혼자 사용. 단 cron 엔드포인트는 `CRON_SECRET` 헤더로 보호 |
| 테스트 | **Vitest + @testing-library/react** | 룰 평가/정규화/임계치 단위 테스트 80% 커버리지 |
| 배포 | **로컬 Node.js 우선, Vercel Hobby 옵션** | 데이터 보존을 위해 로컬 SQLite 권장. 배포 시 Turso 또는 GitHub Actions + 정적 빌드 옵션 |

**의도적 미채택**:
- `framer-motion` — 펄스 애니메이션은 CSS keyframes로 충분. 번들 절감.
- `Redux/Zustand` — 단일 사용자 + 서버 상태 위주라 TanStack Query만으로 충분.
- `Prisma` — 24개 지표 스키마는 좁고 안정적. `better-sqlite3` raw SQL + 타입드 래퍼로 단순.

---

## 3. 디렉토리 구조

```
economyDashboard/
├── src/
│   ├── app/                              # Next.js App Router
│   │   ├── page.tsx                      # 메인 대시보드 (L1+L2+L3)
│   │   ├── layout.tsx                    # 헤더(레짐 배지) + 알림 배너 sticky
│   │   ├── globals.css                   # severity CSS 변수, pulse keyframes
│   │   ├── indicator/[id]/page.tsx       # L4 드릴다운 (장기 차트, 룰 발화 이력)
│   │   ├── alerts/page.tsx               # 알림 히스토리 (필터, 30일+)
│   │   └── api/
│   │       ├── indicators/route.ts       # GET 메인 카드용 (8개 + 보조)
│   │       ├── indicators/[id]/route.ts  # GET 개별 히스토리 (range 쿼리)
│   │       ├── alerts/route.ts           # GET 활성/과거, POST dismiss
│   │       ├── regime/route.ts           # GET 현재 레짐 + 진입시점 + 직전
│   │       ├── releases/route.ts         # GET 향후 발표 일정 (D-7)
│   │       └── cron/
│   │           ├── fetch/route.ts        # 데이터 수집 (FRED/ECOS/KITA/yfinance)
│   │           └── evaluate/route.ts     # 시그널 + 레짐 평가
│   ├── lib/
│   │   ├── sources/
│   │   │   ├── fred.ts                   # FRED API client (14 시리즈)
│   │   │   ├── ecos.ts                   # ECOS API client (환율/금리)
│   │   │   ├── kita.ts                   # 산업부 보도자료 + KITA 백업
│   │   │   ├── yfinance.ts               # 비공식, MOVE/KOSPI 등
│   │   │   ├── stooq.ts                  # CSV 폴백
│   │   │   └── fetchWithFallback.ts      # 1차 실패 시 폴백 + fetch_log
│   │   ├── indicators/
│   │   │   ├── definitions.ts            # 24개 IndicatorDef[]
│   │   │   ├── normalize.ts              # 단위 통일, YoY/MoM/3MStreak 계산
│   │   │   └── thresholds.ts             # severity 판정 (normal/watch/alert)
│   │   ├── signals/
│   │   │   ├── rules.json                # Phase 3 산출물 그대로 import
│   │   │   ├── evaluator.ts              # 룰 평가 엔진 (DSL 파서)
│   │   │   ├── regime.ts                 # 레짐 분류 엔진
│   │   │   ├── cooldown.ts               # 노이즈 억제 (168h/720h)
│   │   │   └── styling.ts                # severity → 색상/아이콘 매핑
│   │   ├── db/
│   │   │   ├── client.ts                 # better-sqlite3 싱글톤
│   │   │   ├── schema.sql                # 테이블 정의
│   │   │   ├── queries.ts                # 타입드 쿼리 함수
│   │   │   └── migrations/               # 001_init.sql, ...
│   │   ├── timezone.ts                   # KST/ET 변환 (date-fns-tz)
│   │   └── env.ts                        # Zod로 process.env 검증
│   ├── components/
│   │   ├── widgets/
│   │   │   ├── IndicatorCard.tsx         # 스파크라인 + 임계치 라인
│   │   │   ├── SpreadChart.tsx           # T10Y2Y 부호별 영역
│   │   │   ├── RegimeBadge.tsx           # 헤더 inline
│   │   │   ├── AlertBanner.tsx           # sticky top (red/purple/stripe)
│   │   │   ├── AlertFeed.tsx             # 시간 역순 + 필터
│   │   │   ├── MultiLineChart.tsx        # US 3Y/10Y/30Y
│   │   │   ├── DualAxisCard.tsx          # KR 수출 전체 + 반도체
│   │   │   ├── CurrencyCard.tsx          # USDKRW + DXY 보조
│   │   │   ├── CategoryHeatmap.tsx       # 6개 카테고리 신호등
│   │   │   └── ReleaseSchedule.tsx       # D-day + ET/KST 병기
│   │   ├── ui/                           # shadcn (Button, Tooltip, Badge 등)
│   │   └── dashboard/
│   │       ├── DashboardGrid.tsx         # 4×2 메인 + 보조 + 사이드바
│   │       └── Header.tsx                # 로고 + 레짐 + 시각 + 알림 벨
│   ├── config/
│   │   ├── indicators.config.ts          # 24개 메타데이터 export
│   │   ├── signals.config.ts             # rules.json loader + 검증
│   │   └── colors.config.ts              # UX 색상 토큰 (Tailwind 매핑)
│   └── styles/
│       └── tailwind.config.ts            # severity/regime 토큰, pulse keyframe
├── data/
│   ├── timeseries.db                     # SQLite (gitignored)
│   └── seed/
│       ├── fred_5y.csv                   # 초기 백필 (5~10년)
│       └── ecos_5y.csv
├── scripts/
│   ├── backfill.ts                       # 초기 히스토리 수집 (5~10년)
│   ├── healthcheck.ts                    # 소스 가용성 점검 (수동 실행)
│   └── migrate.ts                        # SQL 마이그레이션 실행
├── tests/
│   ├── signals/
│   │   ├── evaluator.spec.ts             # 17개 룰 평가 단위
│   │   ├── regime.spec.ts                # 5개 레짐 분류
│   │   ├── cooldown.spec.ts              # 168h/720h 정책
│   │   └── conflict.spec.ts              # 매수/매도 충돌
│   ├── indicators/
│   │   ├── normalize.spec.ts             # YoY/MoM/3MStreak
│   │   └── thresholds.spec.ts
│   └── api/
│       └── indicators.spec.ts            # 통합 (mock fetcher)
├── .env.example
├── .env.local                            # gitignored
├── next.config.js
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

목표: 파일당 200~400줄(상한 800). 위젯 컴포넌트는 단일 책임, 비즈니스 로직(`lib/signals/*`)과 표현 로직(`components/*`)을 분리.

---

## 4. 핵심 TypeScript 인터페이스

```typescript
// src/lib/indicators/definitions.ts
export type SourceType = 'fred' | 'ecos' | 'kita' | 'yfinance' | 'stooq' | 'manual'
export type Category = 'volatility' | 'inflation' | 'rates' | 'credit' | 'korea' | 'fx' | 'commodity' | 'opportunity'
export type Severity = 'normal' | 'info' | 'warning' | 'critical-sell' | 'critical-buy' | 'stale' | 'conflict'

export interface IndicatorDef {
  readonly id: string                              // "FRED_VIXCLS"
  readonly name: string                            // "VIX"
  readonly nameKr: string                          // "VIX 지수"
  readonly category: Category
  readonly source: SourceType
  readonly sourceId: string                        // "VIXCLS"
  readonly fallbackSource?: SourceType
  readonly fallbackSourceId?: string
  readonly unit: 'index' | 'pct' | 'bp' | 'usd' | 'krw' | 'ratio'
  readonly precision: number                       // 소수점 자리
  readonly thresholds: ThresholdConfig
  readonly inverted?: boolean                      // true → 낮을수록 위험
  readonly updateCadence: 'daily' | 'weekly' | 'monthly'
  readonly releaseTimeET?: string                  // "08:30"
  readonly transform?: 'yoy' | 'mom' | 'pct_below_200dma' | 'spread_calc'
}

export interface ThresholdConfig {
  readonly normal: readonly [number, number]
  readonly watch: readonly [number, number]
  readonly alert: readonly [number, number]
  readonly direction: 'above' | 'below'           // 임계치 방향
}

// src/lib/db/types.ts
export interface TimeSeriesPoint {
  readonly indicatorId: string
  readonly asOf: string                            // ISO 8601 (YYYY-MM-DD or full)
  readonly value: number
  readonly source: SourceType
  readonly fetchedAt: string
}

// src/lib/signals/types.ts
export interface SignalRule {
  readonly id: string                              // "VIX_PANIC"
  readonly name: string
  readonly severity: 'info' | 'warning' | 'critical'
  readonly category: 'recession' | 'inflation' | 'volatility' | 'korea' | 'opportunity'
  readonly indicators: readonly string[]
  readonly condition: string                       // DSL 표현식
  readonly cooldownHours: number
  readonly rationale: string
  readonly actionHint: string
}

export interface Signal {
  readonly id: string                              // ULID
  readonly ruleId: string
  readonly severity: 'info' | 'warning' | 'critical'
  readonly category: SignalRule['category']
  readonly type: 'risk' | 'opportunity' | 'conflict'
  readonly triggeredAt: string
  readonly resolvedAt?: string
  readonly dismissedAt?: string
  readonly message: string
  readonly indicators: readonly string[]
  readonly snapshot: Record<string, number>        // 발화 시점 지표 스냅
  readonly actionHint: string
}

export interface RegimeState {
  readonly current: 'goldilocks' | 'risk_on' | 'risk_off' | 'stagflation' | 'recession'
  readonly enteredAt: string
  readonly previous?: RegimeState['current']
  readonly confidence: number                      // 0~1
  readonly triggerSummary: string
}
```

**불변성 원칙**: 모든 인터페이스 `readonly`. 시그널 평가/정규화 함수는 새 객체 반환만 허용. ESLint `functional/immutable-data` 규칙 강제.

---

## 5. 데이터 파이프라인

```
┌──────────────────────────────────────────────────────────────────────┐
│  외부 소스 (인증 키 2종: FRED, ECOS)                                  │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌──────────┐ ┌────────┐           │
│  │ FRED   │ │ ECOS   │ │ KITA   │ │ yfinance │ │ Stooq  │           │
│  │ (HTTPS)│ │ (HTTPS)│ │ (HTML) │ │ (비공식) │ │ (CSV)  │           │
│  └────┬───┘ └────┬───┘ └────┬───┘ └────┬─────┘ └────┬───┘           │
│       │ 14 시리즈 │ 4 시리즈 │ 3 시리즈│ 5 티커     │ 폴백             │
│       └──────────┴──────────┴─────────┴────────────┘                  │
└───────────────────────────┬───────────────────────────────────────────┘
                            ▼
            ┌───────────────────────────────────┐
            │  /api/cron/fetch (KST 09:00 일 1회)│
            │  - lib/sources/* 병렬 호출        │
            │  - fetchWithFallback (지수 백오프)│
            │  - 결측 허용, fetch_log 기록      │
            └───────────────┬───────────────────┘
                            ▼
            ┌───────────────────────────────────┐
            │  SQLite (timeseries 테이블)       │
            │  PRIMARY KEY (indicator_id, as_of)│
            │  INSERT OR REPLACE (upsert)       │
            └───────────────┬───────────────────┘
                            ▼
            ┌───────────────────────────────────┐
            │  /api/cron/evaluate               │
            │  - normalize: YoY/MoM/3MStreak/MA │
            │  - evaluator: 17 룰 DSL 평가      │
            │  - cooldown: 168h/720h 필터       │
            │  - regime: 5 레짐 분류            │
            │  - INSERT signals + regime_history│
            └───────────────┬───────────────────┘
                            ▼
            ┌───────────────────────────────────┐
            │  signals / regime_history 테이블  │
            │  - dismissedAt IS NULL = 활성     │
            │  - 자동 resolve: 조건 해제 시     │
            └───────────────┬───────────────────┘
                            ▼
┌───────────────────────────────────────────────────────────────────────┐
│  프론트엔드 (TanStack Query, 5분 polling)                              │
│  ┌──────────────┐  ┌─────────────┐  ┌──────────────┐  ┌──────────┐  │
│  │ /api/        │  │ /api/       │  │ /api/        │  │ /api/    │  │
│  │ indicators   │  │ alerts      │  │ regime       │  │ releases │  │
│  └──────┬───────┘  └──────┬──────┘  └──────┬───────┘  └────┬─────┘  │
│         ▼                 ▼                ▼                ▼          │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  DashboardGrid (L2 4×2 + L3 사이드바)                          │  │
│  │  - AlertBanner (sticky top, red/purple/stripe)                 │  │
│  │  - RegimeBadge (헤더 inline, D+N)                              │  │
│  │  - 8개 메인 카드 (펄스 애니메이션: 임계치 crossing 1회)        │  │
│  │  - AlertFeed (시간 역순, 필터)                                 │  │
│  │  - ReleaseSchedule (D-7)                                       │  │
│  └────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────┘
```

**핵심 흐름**:
1. **수집** — cron이 1일 1회 KST 09:00에 모든 소스 병렬 fetch. 1차 실패 시 폴백 자동 전환 + `fetch_log` 기록. 동일 시리즈를 여러 소스에 저장하여 비교 가능.
2. **정규화** — raw → YoY/MoM/3MStreak/60dMA/un-inversion 등 룰이 요구하는 파생값 계산.
3. **평가** — 17개 룰 DSL 평가. cooldown 필터링(같은 룰은 168h/720h 내 재발화 금지). 단, severity escalation(warning→critical)은 즉시 허용.
4. **저장** — 신규 활성 시그널 insert, 조건 해제된 시그널은 `resolvedAt` 업데이트(자동 resolve).
5. **표시** — 프론트가 5분 polling. 새 active signal 발견 시 카드 펄스(1회 1.5초), 배너 표시.

---

## 6. SQLite 스키마

```sql
-- src/lib/db/schema.sql

-- 시계열 (raw + 정규화는 별도 view 또는 런타임 계산)
CREATE TABLE IF NOT EXISTS timeseries (
  indicator_id TEXT NOT NULL,
  as_of TEXT NOT NULL,                       -- ISO YYYY-MM-DD
  value REAL NOT NULL,
  source TEXT NOT NULL,                      -- 'fred' | 'ecos' | 'kita' | 'yfinance' | 'stooq' | 'manual'
  fetched_at TEXT NOT NULL,                  -- ISO datetime
  PRIMARY KEY (indicator_id, as_of, source)
);
CREATE INDEX IF NOT EXISTS idx_ts_indicator_asof ON timeseries(indicator_id, as_of DESC);

-- 시그널 (활성 + 과거)
CREATE TABLE IF NOT EXISTS signals (
  id TEXT PRIMARY KEY,                       -- ULID
  rule_id TEXT NOT NULL,
  severity TEXT NOT NULL CHECK(severity IN ('info','warning','critical')),
  category TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('risk','opportunity','conflict')),
  triggered_at TEXT NOT NULL,
  resolved_at TEXT,                          -- NULL = 활성
  dismissed_at TEXT,                         -- NULL = 미dismiss
  message TEXT NOT NULL,
  indicators TEXT NOT NULL,                  -- JSON array
  snapshot TEXT NOT NULL,                    -- JSON object {indicator: value}
  action_hint TEXT
);
CREATE INDEX IF NOT EXISTS idx_signals_active ON signals(resolved_at, triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_signals_rule ON signals(rule_id, triggered_at DESC);

-- 레짐 진입 히스토리
CREATE TABLE IF NOT EXISTS regime_history (
  entered_at TEXT NOT NULL PRIMARY KEY,
  regime TEXT NOT NULL CHECK(regime IN ('goldilocks','risk_on','risk_off','stagflation','recession')),
  confidence REAL NOT NULL,
  trigger_summary TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_regime_entered ON regime_history(entered_at DESC);

-- 수집 로그 (장애 추적)
CREATE TABLE IF NOT EXISTS fetch_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  indicator_id TEXT,
  fetched_at TEXT NOT NULL,
  success INTEGER NOT NULL CHECK(success IN (0,1)),
  rows_inserted INTEGER DEFAULT 0,
  error TEXT,
  duration_ms INTEGER
);
CREATE INDEX IF NOT EXISTS idx_fetch_log_recent ON fetch_log(fetched_at DESC);

-- 발표 일정 (수동 시드 + 자동 갱신)
CREATE TABLE IF NOT EXISTS release_schedule (
  id TEXT PRIMARY KEY,
  event_name TEXT NOT NULL,
  country TEXT NOT NULL,                     -- 'US' | 'KR' | 'EU'
  due_at_et TEXT NOT NULL,                   -- ISO ET
  due_at_kst TEXT NOT NULL,
  importance INTEGER NOT NULL CHECK(importance BETWEEN 1 AND 3)
);

-- 수동 입력값 (KOSPI Fwd EPS 등)
CREATE TABLE IF NOT EXISTS manual_overrides (
  indicator_id TEXT NOT NULL,
  as_of TEXT NOT NULL,
  value REAL NOT NULL,
  entered_at TEXT NOT NULL,
  note TEXT,
  PRIMARY KEY (indicator_id, as_of)
);
```

**설계 결정**:
- `timeseries`의 PK에 `source` 포함 → 동일 시리즈를 여러 소스(예: VIX = FRED + yfinance)에서 받아 비교 가능.
- 정규화(YoY/MoM 등)는 별도 테이블 없이 런타임 계산. 24 지표 × 5년 ≈ 30K 행이라 캐시 불필요.
- `signals.resolved_at IS NULL` = 활성. 자동 resolve는 cron이 평가 후 조건 해제 확인 시 업데이트.
- `fetch_log`는 헬스체크 + 사용자 알림("yfinance 30일+ 실패 → 인앱 안내")에 활용.

---

## 7. 환경변수

```bash
# .env.example
# 필수 (둘 다 무료, 이메일 등록)
FRED_API_KEY=                              # https://fred.stlouisfed.org/docs/api/api_key.html
ECOS_API_KEY=                              # https://ecos.bok.or.kr/api/

# 선택 (폴백·보조)
ALPHA_VANTAGE_KEY=                         # 시장 데이터 폴백
PUBLIC_DATA_API_KEY=                       # data.go.kr (KITA OpenAPI 사용 시)

# 운영
NEXT_PUBLIC_BASE_URL=http://localhost:3000
DB_PATH=./data/timeseries.db
CRON_SECRET=                               # /api/cron/* 보호 (랜덤 32자)
DATA_REFRESH_CRON=0 0 * * *                # UTC 00:00 = KST 09:00
LOG_LEVEL=info                             # info | debug | warn | error
TZ=Asia/Seoul                              # 서버 기준 시간대

# 표시 옵션
NEXT_PUBLIC_DEFAULT_THEME=system           # system | light | dark
```

`.env.local`은 `.gitignore`에 포함. `lib/env.ts`에서 Zod로 검증:

```typescript
import { z } from 'zod'

const envSchema = z.object({
  FRED_API_KEY: z.string().length(32),
  ECOS_API_KEY: z.string().min(20),
  ALPHA_VANTAGE_KEY: z.string().optional(),
  DB_PATH: z.string().default('./data/timeseries.db'),
  CRON_SECRET: z.string().min(16),
  NEXT_PUBLIC_BASE_URL: z.string().url(),
})

export const env = envSchema.parse(process.env)
```

---

## 8. 운영 시나리오

### 8.1 로컬 모드 (기본, 권장)

- **실행**: `npm run dev` (개발) 또는 `npm run build && npm start` (운영)
- **스케줄러**: `node-cron`이 Next.js 서버 부팅 시 등록 → KST 09:00에 `/api/cron/fetch` 내부 호출
- **DB**: `./data/timeseries.db` (로컬 파일)
- **백업**: 일 1회 `cp timeseries.db timeseries.db.bak` (선택)
- **접속**: 브라우저 `http://localhost:3000`
- **장점**: 비용 $0, 데이터 영속성 보장, 인증 불필요

### 8.2 Vercel Hobby 모드 (선택)

- **DB**: Vercel은 ephemeral → **Turso (libSQL, SQLite 호환)** 무료 티어 사용. 또는 Supabase Postgres 무료 티어.
- **스케줄러**: Vercel Cron (`vercel.json`에 정의) — 무료는 일 2회까지. KST 09:00 + KST 21:00 또는 일 1회로 충분.
- **인증**: Vercel 환경변수에 `CRON_SECRET` 설정 후 `Authorization` 헤더 검증.
- **비용**: $0/년 (Turso 무료 + Vercel Hobby).

### 8.3 GitHub Actions + 정적 빌드 (라이트 옵션)

- GitHub Actions가 일 1회 cron으로 데이터 fetch + SQLite를 리포에 커밋.
- Next.js를 정적 빌드 후 Vercel/GitHub Pages 배포.
- **장점**: 서버 프로세스 불필요, 완전 정적.
- **단점**: 알림 dismiss 등 mutation 어려움 → 본 프로젝트엔 비추천.

**권장 선택**: 처음에는 8.1 로컬 모드로 시작. 안정화 후 8.2로 전환 검토.

---

## 9. 4주 구현 로드맵

### Week 1 — 기반 + 핵심 5지표 (US 매크로)

목표: VIX/T10Y2Y/US10Y/Core CPI/HY OAS 5개 카드가 메인에 표시되고 데이터가 SQLite에 영속화.

- [ ] Next.js 14 + TypeScript + Tailwind + shadcn 셋업 (`create-next-app --typescript --tailwind --app`)
- [ ] `tailwind.config.ts`에 Phase 4 색상 토큰(severity/regime) 등록
- [ ] `lib/db/` SQLite 스키마 + 마이그레이션 + queries 래퍼
- [ ] `lib/sources/fred.ts` 구현 (재시도, rate limit 안전)
- [ ] `lib/indicators/definitions.ts` 24개 메타데이터 작성 (Phase 2 매핑 그대로)
- [ ] `IndicatorCard` 위젯 + 스파크라인(Recharts) + 임계치 라인
- [ ] `api/indicators/route.ts` GET 엔드포인트 + TanStack Query 연결
- [ ] 5개 카드 메인 표시, 셀프 호스트 cron으로 1일 1회 갱신
- [ ] 시드 스크립트(`scripts/backfill.ts`)로 직전 1~5년 백필
- [ ] Vitest 셋업 + `normalize.spec.ts` 80% 커버리지

### Week 2 — 한국 데이터 + 단일 룰 + 알림 피드

목표: 한국 수출/USDKRW/DXY 추가, 11개 단일 룰 평가 작동, AlertFeed 우측 사이드바.

- [ ] `lib/sources/ecos.ts` (환율, 기준금리)
- [ ] `lib/sources/kita.ts` (산업부 보도자료 스크래핑 + 수동 입력 폴백)
- [ ] `lib/sources/yfinance.ts` + `stooq.ts` 폴백 체인
- [ ] `lib/sources/fetchWithFallback.ts` 지수 백오프 + `fetch_log`
- [ ] `lib/signals/evaluator.ts` 단일 조건 DSL 파서 (`>`, `<`, `YoY`, `MoMAnnualized` 지원)
- [ ] `lib/signals/cooldown.ts` 168h/720h 정책
- [ ] 11개 단일 룰(`VIX_WARN`, `VIX_PANIC`, `T10Y2Y_INVERT`, `T10Y3M_INVERT`, `CORE_CPI_HOT`, `HY_OAS_STRESS`, `HY_OAS_PANIC`, `DXY_STRONG`, `KR_EXPORT_WEAK`, `KR_EXPORT_CRASH`, `USDKRW_HIGH`) 평가 + 저장
- [ ] `AlertFeed` 위젯 + 필터 칩 + dismiss
- [ ] `SpreadChart`, `CurrencyCard`, `DualAxisCard` 위젯
- [ ] `api/alerts/route.ts` GET + POST dismiss
- [ ] `evaluator.spec.ts` 11개 룰 케이스별 단위 테스트

### Week 3 — 복합 시그널 + 레짐 + sticky 배너

목표: 6개 복합 룰 + 5개 레짐 분류 + AlertBanner sticky + 카드 펄스.

- [ ] `lib/signals/evaluator.ts` AND/OR 복합 조건 확장 (`_60dMA`, `_3MStreak`, `_6Msustained`, `_unInversion`, `_signFlipPositive` 등)
- [ ] 6개 복합 룰(`RECESSION_COMPOSITE`, `INFLATION_REACCEL`, `BUY_PANIC`, `KR_SLOWDOWN_COMPOSITE`, `EARLY_RECOVERY`, `STAGFLATION_COMPOSITE`) 평가
- [ ] `lib/signals/regime.ts` 5개 레짐 분류 + 진입 시점 + 직전 레짐
- [ ] `RegimeBadge` 헤더 inline (D+N 표시) + 진입 히스토리 모달
- [ ] `AlertBanner` sticky top (red / purple / stripe)
- [ ] `priority_policy` 구현 (severity desc + 시간 desc + 카테고리 그룹화)
- [ ] 매수/매도 CONFLICT 처리 (양쪽 병기 + ⚡ 배지)
- [ ] 카드 펄스 애니메이션 (Tailwind keyframes, 임계치 crossing 1회)
- [ ] `CategoryHeatmap` 6개 카테고리 신호등
- [ ] `regime.spec.ts`, `cooldown.spec.ts`, `conflict.spec.ts` 단위 테스트

### Week 4 — 반응형 + 드릴다운 + 마무리

목표: tablet/mobile 반응형, L4 개별 지표 페이지, ReleaseSchedule, README + 배포 가이드.

- [ ] 반응형 그리드 (1280/768/<768 브레이크포인트)
- [ ] 모바일 bottom tab + sticky 헤더 + 별도 알림 탭
- [ ] `app/indicator/[id]/page.tsx` L4 드릴다운 (장기 차트, 룰 발화 이력, 관련 룰)
- [ ] `app/alerts/page.tsx` 알림 히스토리 (30일+)
- [ ] `ReleaseSchedule` 위젯 + `api/releases/route.ts`
- [ ] 다크 모드 (`prefers-color-scheme` + 수동 토글)
- [ ] 접근성(WCAG AA, aria-label, focus ring, `prefers-reduced-motion`)
- [ ] `scripts/healthcheck.ts` 소스 가용성 점검
- [ ] README + 배포 가이드(로컬/Vercel 양쪽)
- [ ] E2E 1~2개 시나리오(Playwright) — 메인 로드, 알림 dismiss

각 주차 끝에는 `npm run test`, `npm run build`, `npm run typecheck`가 모두 통과해야 다음 주차로 진행.

---

## 10. 비용 추정

| 항목 | 로컬 모드 | Vercel + Turso | 비고 |
|------|---------|---------------|------|
| 서버 | $0 (자체 PC/맥) | $0 (Vercel Hobby) | Vercel은 일 2회 cron 무료 |
| DB | $0 (로컬 SQLite) | $0 (Turso 무료 9GB) | Turso는 SQLite 호환 |
| FRED API | $0 | $0 | 120 req/min |
| ECOS API | $0 | $0 | 10,000 req/day |
| KITA / data.go.kr | $0 | $0 | 신청 후 무료 |
| yfinance / Stooq | $0 | $0 | 비공식, 폴백 필수 |
| 도메인 (선택) | $0 | $10/년 | 안 써도 됨 |
| **합계** | **$0/년** | **$0~$10/년** | 사용자 brief "거의 0원" 충족 |

---

## 11. 기술 부채 / 리스크 / 완화

| 리스크 | 영향 | 완화 |
|-------|------|------|
| yfinance 비공식 API | KOSPI/MOVE 일중 데이터 끊김 | Stooq CSV 폴백 + FRED 동등 시리즈 자동 전환 + `fetch_log` 30일+ 실패 시 인앱 알림 |
| KITA/산업부 HTML 파싱 | 발표 양식 변경 시 깨짐 | 정규식 + 수동 입력 폴백 (`manual_overrides` 테이블) |
| KOSPI 12M Fwd EPS 부재 | 한국 이익 모멘텀 정확도 ↓ | `KR_EXP YoY`를 프록시로 사용 + UI에 "프록시" 배지 명시 |
| ECOS 통계표 코드 변경 | 환율/금리 fetch 실패 | 코드를 상수 + 통계표 코드 외부 설정화, 실패 시 yfinance `KRW=X` 폴백 |
| SQLite 동시 쓰기 한계 | — | 단일 사용자라 무관. WAL 모드 활성화로 read-while-write 안전 |
| 시그널 룰 백테스트 미실시 | 임계치 적절성 미검증 | Phase 6+에서 보강. 초기엔 Phase 3의 historical_triggers 명세 기반 |
| 한국 공휴일/주말 데이터 결측 | stale 오탐 | `releaseSchedule` + `updateCadence` 기반 stale 판정. 발표 D+3까지 결측 허용 |
| Vercel ephemeral 파일 시스템 | 배포 시 SQLite 손실 | 로컬 모드 기본 권장. 배포 시 Turso 전환 |
| 24개 지표 단위 혼재 (%, bp, index, KRW) | UI 표시 오류 | `IndicatorDef.unit` + `precision`으로 명시 표기, 정규화는 `lib/indicators/normalize.ts` 집중 |

---

## 12. 테스트 전략

### 12.1 단위 (Vitest, 80%+ 커버리지)

- `lib/indicators/normalize.spec.ts` — YoY/MoM/3MStreak/60dMA/un-inversion/signFlipPositive 계산 정확도
- `lib/indicators/thresholds.spec.ts` — normal/watch/alert 판정 경계값
- `lib/signals/evaluator.spec.ts` — 17개 룰 각각 발화 케이스 + false positive 케이스
- `lib/signals/cooldown.spec.ts` — 168h/720h 정책, severity escalation 예외
- `lib/signals/regime.spec.ts` — 5개 레짐 진입/이탈, 60일 이동평균 기반
- `lib/signals/conflict.spec.ts` — 매수/매도 동시 발화 시 CONFLICT 처리
- `lib/timezone.spec.ts` — KST/ET 변환 + DST 처리

### 12.2 통합

- `tests/api/indicators.spec.ts` — Mock fetcher로 cron → DB → API 응답 체인
- `tests/api/alerts.spec.ts` — 시그널 생성 → 활성/dismiss/resolved 라이프사이클

### 12.3 E2E (Playwright, 선택)

- 메인 페이지 로드 + 카드 8개 렌더링 + 레짐 배지 표시
- AlertBanner sticky + dismiss → 재방문 시 숨김 유지
- 다크 모드 토글 + 색상 토큰 적용 확인

### 12.4 시각 회귀 (선택)

- Storybook으로 위젯 카탈로그 + Chromatic으로 변경 감지. 본 프로젝트에서는 우선순위 낮음.

---

## 13. 향후 확장 옵션 (본 프로젝트 범위 밖)

- **외부 알림 채널** — `lib/notify/` 디렉토리 골격은 유지하되 빈 구현. 활성화는 사용자 요청 시.
- **백테스트 모듈** — 룰별 historical_triggers 자동 검증, 신호 정확도/false positive rate 계산. Python + DuckDB 분리 권장.
- **자산 배분 자동화** — 레짐별 `asset_allocation_hint`를 실제 포트폴리오에 mapping. 본 프로젝트는 "표시만", 행동은 사용자.
- **다국가 매크로** — 일본(BOJ JGB10), 중국(차이신 PMI) 등. ECOS와 유사한 패턴으로 확장.
- **Phase 3 룰 자동 캘리브레이션** — 임계치를 분위수 기반(상위 10% 등)으로 동적 조정.
- **모바일 PWA** — Next.js의 PWA 플러그인. Service Worker로 오프라인 캐시.
- **GraphQL 또는 tRPC** — 클라이언트 타입 안전성↑. 단일 사용자엔 REST + Zod로 충분.

---

## 부록 A — 색상 토큰 → Tailwind 매핑 (Phase 4 인계 정확 반영)

```typescript
// src/styles/tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        severity: {
          normal: '#10b981',           // emerald-500
          info: '#6b7280',             // slate-500
          warning: '#f59e0b',          // amber-500
          'critical-sell': '#ef4444',  // red-500 (매도형)
          'critical-buy': '#a855f7',   // purple-500 (매수형)
          stale: '#9ca3af',            // gray-400
        },
        regime: {
          goldilocks: { light: '#d1fae5', dark: '#065f46' },
          'risk-on':   { light: '#dcfce7', dark: '#166534' },
          'risk-off':  { light: '#fef3c7', dark: '#92400e' },
          stagflation: { light: '#ffedd5', dark: '#9a3412' },
          recession:   { light: '#fee2e2', dark: '#991b1b' },
        },
      },
      backgroundImage: {
        'conflict-stripe':
          'repeating-linear-gradient(45deg, #f59e0b 0 10px, #a855f7 10px 20px)',
      },
      keyframes: {
        'pulse-severity': {
          '0%':   { boxShadow: '0 0 0 0 var(--severity-color)' },
          '70%':  { boxShadow: '0 0 0 8px transparent' },
          '100%': { boxShadow: '0 0 0 0 transparent' },
        },
      },
      animation: {
        'pulse-severity': 'pulse-severity 1.5s ease-out 1',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
```

## 부록 B — 시그널 룰 JSON 직접 임포트 패턴

Phase 3 산출물(`03_signal_rules.json`)을 변환 없이 그대로 사용한다.

```typescript
// src/config/signals.config.ts
import rulesJson from '@/_workspace/03_signal_rules.json'
import { z } from 'zod'

const ruleSchema = z.object({
  id: z.string(),
  name: z.string(),
  severity: z.enum(['info', 'warning', 'critical']),
  category: z.enum(['recession', 'inflation', 'volatility', 'korea', 'opportunity']),
  indicators: z.array(z.string()),
  condition: z.string(),
  cooldown_hours: z.number(),
  rationale: z.string(),
  action_hint: z.string(),
})

const rulesetSchema = z.object({
  version: z.string(),
  rules: z.array(ruleSchema),
  regimes: z.array(z.object({
    name: z.string(),
    label: z.string(),
    trigger: z.string(),
    exit: z.string(),
    guidance: z.string(),
  })),
  priority_policy: z.object({
    severity_rank: z.record(z.string(), z.number()),
    cooldown_default_hours: z.number(),
  }).passthrough(),
})

export const ruleset = rulesetSchema.parse(rulesJson)
export const rules = ruleset.rules
export const regimes = ruleset.regimes
```

빌드 타임에 스키마 검증 실패 시 즉시 에러 → 룰 JSON 변경이 코드와 동기화되도록 강제.

## 부록 C — 알림 데이터 흐름 (인앱만, 외부 채널 배제 명시)

```
[evaluator] 룰 발화 감지
    │
    ▼
[cooldown.ts] 168h/720h 정책 적용
    │ (재발화 허용 여부 결정)
    ▼
[db.queries.insertSignal()] signals 테이블 INSERT
    │
    ▼
[프론트 TanStack Query] /api/alerts 5분 polling
    │
    ▼
[AlertBanner / AlertFeed / Card pulse]  ← 인앱 표시만
    │
    ▼
[사용자 dismiss] POST /api/alerts/{id}/dismiss → signals.dismissed_at 업데이트
```

**명시적으로 미구현**:
- `lib/notify/webpush.ts` — 비활성
- `lib/notify/slack.ts` — 비활성
- `lib/notify/email.ts` — 비활성

사용자 brief의 "인앱 알림만" 요구를 코드 레벨에서 강제. 향후 활성화 시 `lib/notify/` 디렉토리만 추가하면 되도록 인터페이스 분리.
