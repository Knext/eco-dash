# 거시지표 기반 투자 대시보드 — 설계 문서

작성일: 2026-05-16
대상 사용자: 한국 개인 투자자 (중기 시간축, 한국+미국+글로벌 ETF/채권)
설계 모드: 에이전트 팀 (5인) — `investment-dashboard-design` 오케스트레이터
산출물 인덱스: `_workspace/00_brief.md`, `01_analyst_indicators.md`, `02_datasource_mapping.md`, `03_signal_rules.json`+`.md`, `04_ux_design.md`, `05_tech_architecture.md`

---

## 0. Executive Summary

**목적**: 글로벌 매크로 지표 23~24개를 한 화면에 모니터링하고, 학술·실증 근거가 있는 17개 시그널 룰로 매수/매도 거시 판단을 보조한다. 한국 투자자가 한국·미국·글로벌 ETF 3개 자산군을 동시에 운용한다는 가정.

**핵심 가치**:
- "한눈에 80%" — 인터랙션 없이 메인 화면에서 거시 상태(레짐) + 핵심 지표 8개 + 활성 critical 알림을 즉시 파악
- "왜 이 알림이 떴는가" — 모든 알림에 `rationale`, `false_positive_note`, `action_hint` 동봉
- "매수/매도를 색상으로 구분" — 매도 critical = 빨강, 매수 critical = 보라. 행동 반전 방지

**권장 스택**: Next.js 14 + TypeScript + Tailwind + shadcn/ui + better-sqlite3 + TanStack Query, 로컬 단일 사용자 모드. **비용 $0~$10/년**, 구현 4주.

**현재 단계**: 설계 완료. 즉시 구현 착수 가능.

---

## 1. 모니터링 지표 카탈로그

총 **23개 지표 / 6개 카테고리** (사용자 명시 7개 + 분석가 추가 16개).
임계치는 가능한 한 학술·역사적 분포 기반(예: 1990년 이후 백분위)으로 설정.

### 1.1 카테고리별 지표

| 카테고리 | 지표 (정상/경계/위험) |
|---------|--------------------|
| **변동성·공포** | VIX (12-20/20-30/30+) · MOVE (60-100/100-150/150+) · SKEW (120-135/135-145/145+) |
| **인플레이션** | Headline CPI · Core CPI YoY (<2.5/2.5-3.5/3.5+) · Core CPI MoM(연율) · PPI · BEI 10Y (2-2.5/2.5-3/3+) |
| **금리·유동성** | Fed Funds · US 3M/2Y/3Y/10Y/30Y · **T10Y2Y (>50bp/0-50bp/<0)** · **T10Y3M (>100bp/0-100bp/<0)** |
| **한국 매크로** | 한국 수출 YoY (>+5/0-5/<0, 위험-10) · 반도체 수출 YoY · 무역수지 · USD/KRW (1100-1300/1300-1400/1400+) · KOSPI 12M Fwd EPS · 외국인 KOSPI 순매수 |
| **글로벌 활동성** | DXY (90-100/100-105/105+) · WTI · Copper/Gold · BDI |
| **신용 스트레스** | **HY OAS (300-400/500-700/800+ bp)** · IG OAS · TED/SOFR-OIS |

### 1.2 핵심 조합 시그널 (단독 부족, 결합 시 강력)

5개 조합이 매크로 의사결정의 1차 입력:

1. **침체 임박**: `T10Y2Y < 0 (6M 지속) AND T10Y3M < 0 AND HY OAS > 600bp AND VIX 20DMA > 25` — 1990·2000·2007 모두 12M 내 침체
2. **인플레이션 재가속**: `Core CPI MoM 연율>3.6% (3M연속) AND PPI YoY>3% AND WTI YoY>20% AND BEI>2.7%` — 2022 상반기 정확히 적중
3. **패닉 역발상 매수**: `VIX>35 AND HY OAS>800bp AND SPX 200DMA-15% AND Fed 완화 시그널` — 2008·2020 모두 12M 후 +20% (단, *Fed 반응* 조건 없으면 추가 하락 위험)
4. **한국 경기 둔화**: `한국 수출<-5% 3M연속 AND 반도체-10% AND DXY>105 AND 외국인 4주 순매도`
5. **Risk-On 재진입**: `VIX<20 AND HY OAS 100bp+ 축소 3M AND Cu/Gold 상승전환 AND 한국 수출 YoY (+) 전환`

### 1.3 메인 뷰 8개 (한 화면 표시)

| # | 지표 | 카테고리 | 선정 근거 |
|---|------|---------|---------|
| 1 | **VIX** | 변동성 | 사용자 명시. 미국 주식 리스크 1차 게이지 |
| 2 | **Core CPI YoY** (+MoM 보조) | 인플레 | Fed 정책의 실제 타깃 |
| 3 | **T10Y2Y 스프레드** | 금리 | 학술적 침체 예측력 1위 |
| 4 | **US 10Y** (3Y/30Y 오버레이) | 금리 | 사용자 명시. 글로벌 할인율 |
| 5 | **HY OAS** | 신용 | 주식보다 1-3개월 선행 |
| 6 | **DXY** | 글로벌 | 한국·이머징·원자재 비중 사용자에 필수 |
| 7 | **한국 수출 YoY** (+반도체) | 한국 | 사용자 명시. KOSPI EPS와 r≈0.7 |
| 8 | **USD/KRW** | 한국 | 한국 투자자 환 익스포저 직결 |

서브 뷰(스크롤): PPI, BEI, MOVE, Cu/Gold, WTI, KOSPI Fwd EPS, 외국인 순매수, IG OAS, Fed Funds, BDI.

### 1.4 한국 투자자 관점 6대 주의사항

1. **환율 상충 효과**: DXY↑ = 미국 자산 원화환산 가치↑ 동시 KOSPI 외국인 매도. 양쪽 자산 보유 시 자연 헤지/상쇄
2. **시간대 차이**: CPI/FOMC ET 발표 → 다음날 KOSPI 갭. 알림에 KST+ET 병기
3. **KOSPI는 글로벌 매크로 1~2주 지연** + 외국인 수급 민감
4. **반도체 사이클** 별도 추적 (한국 수출의 ~20%)
5. **세제·배당** 차이는 본 문서 범위 외, 자산 배분 시 별도 고려
6. **북한/정치 리스크**: 정량화 어려움 → 별도 뉴스 패널 권장

---

## 2. 데이터 소스 매핑

**커버리지: 23/24 무료 (~96%)**, 인증키 2종 (FRED + ECOS) 모두 이메일 등록 즉시 발급. **운영 비용 0원**.

### 2.1 권장 소스 조합

```
미국 매크로/금리/스프레드/원자재  →  FRED (1차)
한국 매크로/환율/금리             →  ECOS (1차)
한국 수출입/무역수지              →  KITA/산업부 (1차) + ECOS (폴백)
지수/ETF/티커 OHLCV              →  Yahoo Finance (1차, 비공식) + Stooq (폴백)
KOSPI EPS                       →  무료 정공 없음 → 한국 수출 YoY 프록시 또는 수동
```

### 2.2 주요 FRED 시리즈 ID

| 카테고리 | 시리즈 ID |
|---------|----------|
| 변동성 | `VIXCLS` |
| 물가 | `CPIAUCSL`, `CPILFESL`, `PPIACO`/`PPIFIS`, `T10YIE` |
| 금리 | `DGS3MO`, `DGS2`, `DGS3`, `DGS10`, `DGS30`, `DFF`, `FEDFUNDS` |
| 스프레드 | `T10Y2Y`, `T10Y3M`, `BAMLH0A0HYM2` (HY OAS) |
| 통화/원자재 | `DTWEXBGS`, `DCOILWTICO`, `GOLDAMGBD228NLBM`, `PCOPPUSDM` |

### 2.3 한국 데이터 (ECOS + KITA/산업부)

- **ECOS API**: 1일 10,000 요청 무료. 통계표 코드 (`722Y001` 기준금리, `731Y001` 시장환율, `901Y014` 수출입, `301Y013` BOP) — *구현 단계에서 ECOS UI 재확인 필수*
- **KITA/산업부**: 매월 1일 09:00 KST 산업부 보도자료가 가장 빠름. 정규식 파싱 또는 수동 1줄 입력 폼 권장
- **KRX**: 외국인 순매수 등 무료 일별

### 2.4 무료 소스 부재·제약 (graceful degradation 필수)

| 지표 | 문제 | 대응 |
|------|------|------|
| MOVE Index | FRED 미수록 | yfinance `^MOVE` (비공식) |
| KOSPI 12M Fwd EPS | 무료 정공 없음 | 한국 수출 YoY 프록시 + `manual_overrides` 테이블 |
| BDI | Baltic Exchange 유료 | 스크래핑 또는 누락 허용 |
| SKEW | CBOE 일일 CSV | 다운로드 스크립트 별도 |

### 2.5 환경변수

```bash
FRED_API_KEY=                              # https://fred.stlouisfed.org/docs/api/api_key.html
ECOS_API_KEY=                              # https://ecos.bok.or.kr/api/
ALPHA_VANTAGE_KEY=                         # 선택
PUBLIC_DATA_API_KEY=                       # KITA OpenAPI 시
DB_PATH=./data/timeseries.db
CRON_SECRET=                               # /api/cron/* 보호
TZ=Asia/Seoul
```

### 2.6 수집 아키텍처

- **일별 데이터** (CPI/금리/스프레드 등): KST 09:00 cron 1회
- **시장 데이터** (VIX/DXY/환율): 15~60분 polling (장중)
- **재시도**: 지수 백오프 (1s, 2s, 4s)
- **캐시**: SQLite에 영속화하여 rate limit 회피 + 백테스트 히스토리 확보 (5~10년)

---

## 3. 매수/매도 시그널 룰

**총 17개 룰** (단일 11 + 복합 6) + **레짐 5개**. 모든 룰에 `rationale`, `historical_triggers`, `false_positive_note`, `action_hint` 4종 메타 필수.

### 3.1 Severity 정책 (3단계)

| 등급 | 의미 | 기대 행동 | Cooldown |
|------|------|---------|---------|
| **info** | 정보 제공 | 인지만 | 168h (1주) |
| **warning** | 포지션 점검 | 1주 내 비중 검토 | 168h (변동성/신용) 또는 336h (환율) |
| **critical** | 즉각 행동 검토 | 분할 매수/매도 실행 | 720h (30일) for 사이클성 |

**Escalation 예외**: cooldown 중에도 `warning → critical` 등급 상승은 즉시 재발송.

### 3.2 단일 시그널 11개

| ID | 이름 | severity | 조건 |
|----|------|----------|------|
| **VIX_WARN** | 변동성 경계 | warning | VIX > 30 |
| **VIX_PANIC** | 패닉 | critical | VIX > 40 |
| **T10Y2Y_INVERT** | 10Y-2Y 역전 | warning | T10Y2Y 60일 평균 < 0 |
| **T10Y3M_INVERT** | 10Y-3M 역전 | warning | T10Y3M < 0 |
| **CORE_CPI_HOT** | 근원 인플레 과열 | warning | Core CPI YoY > 4% |
| **HY_OAS_STRESS** | 신용 스트레스 | warning | HY OAS > 600bp |
| **HY_OAS_PANIC** | 신용 패닉 (역발상 기회) | critical (opportunity) | HY OAS > 800bp |
| **DXY_STRONG** | 달러 강세 | info | DXY > 105 |
| **KR_EXPORT_WEAK** | 한국 수출 둔화 | warning | 수출 YoY < -5% |
| **KR_EXPORT_CRASH** | 한국 수출 급락 | critical | 수출 YoY < -10% (3M 연속) |
| **USDKRW_HIGH** | 원/달러 부담 | info | USD/KRW > 1350 |

### 3.3 복합 시그널 6개

| ID | 카테고리 | 핵심 조건 |
|----|---------|---------|
| **RECESSION_COMPOSITE** | recession | T10Y2Y 6M 역전 + HY OAS>600bp + VIX 60일>25 |
| **INFLATION_REACCEL** | inflation | Core CPI MoM 연율>3.6% (3M) + PPI YoY>3% + WTI YoY>20% |
| **BUY_PANIC** | opportunity | VIX>35 + HY OAS>800bp + SPX 200DMA-15% |
| **KR_SLOWDOWN_COMPOSITE** | korea | 한국수출<-5% (3M) + 반도체<-10% + DXY>105 + 외국인 4주 순매도 |
| **EARLY_RECOVERY** | opportunity | T10Y2Y un-inversion + 한국 수출 YoY (-)→(+) + VIX<20 |
| **STAGFLATION_COMPOSITE** | inflation | Core CPI>4% + DXY>105 + 글로벌 PMI 둔화 |

### 3.4 거시 레짐 5개

| 레짐 | 자산 시사 |
|------|---------|
| **Goldilocks** (성장↑ 인플레↓ VIX낮음) | 한국주식↑ 미국주식↑ 채권 중립 현금↓ |
| **Risk-On** (VIX<20 HY 안정) | 한국주식↑ 미국주식↑ 채권↓ 현금↓ |
| **Risk-Off** (VIX>25 또는 HY>500bp) | 한국주식↓ 미국주식 중립 채권↑ 현금/금↑ |
| **Stagflation** (Core CPI>4% + GDP 둔화) | 주식↓ 채권↓ 원자재·금·필수소비재↑ |
| **Recession** (RECESSION_COMPOSITE 발화) | 주식↓↓ 장기채↑↑ 현금↑ |

레짐은 60일 평균 기반으로 단발 룰보다 천천히 변함. 60일이 너무 잦으면 90일로 확장 가능.

### 3.5 우선순위 / 충돌 처리

1. severity 내림차순 → 시간 내림차순
2. 같은 category에 critical + warning 동시 발화 → critical만 표시
3. **매수+매도 동시 critical** → 양쪽 병기 + `CONFLICT` 배지(⚡). **시스템이 결론 내리지 않고 사용자에게 위임**
4. 레짐 vs 단발 룰 충돌 시 단발 룰 우선 표시, 레짐 배지는 보류 (수일 이상 지속 시 자연 전환)

### 3.6 한국 시장 시차 가이드

- 미국 매크로(VIX, T10Y2Y, HY OAS) → KOSPI 영향: **1~2주 지연** (외국인 수급 후행)
- 한국 매크로(수출, 환율) → KOSPI: 동행 또는 1개월 선행
- **실무**: 미국 critical 시그널 발화 시 KOSPI 행동은 즉시 아닌 1~2주 분할 실행

---

## 4. 대시보드 UX 설계

**원칙**: 한눈에 80% / 데이터-잉크 비율 최대화 / 색상+아이콘+텍스트 3중 인코딩 / 한국 시간대 기본+ET 병기 / 노이즈<시그널 / 자동 결론 금지.

### 4.1 정보 위계 4단계

| 레벨 | 위치 | 내용 |
|------|------|------|
| **L1** (영구) | 헤더 + 배너 sticky | 레짐 배지 + 활성 critical 알림 |
| **L2** (스크롤 없이) | 메인 그리드 4×2 | 8개 핵심 카드 |
| **L3** (스크롤/탭) | 보조 그리드 + 사이드바 | 보조 카드, 알림 피드, 발표 일정 |
| **L4** (드릴다운) | `/indicator/[id]` | 장기 차트, 룰 발화 이력 |

### 4.2 색상 토큰 (Phase 3 매도/매수 분리 엄수)

| 상태 | HEX | Tailwind | 아이콘 |
|------|-----|---------|-------|
| normal | `#10b981` | emerald-500 | ● |
| info | `#6b7280` | slate-500 | ℹ |
| warning | `#f59e0b` | amber-500 | ▲ |
| **critical (매도/리스크)** | `#ef4444` | red-500 | ⚠ |
| **critical (매수기회)** | `#a855f7` | purple-500 | ★ |
| stale | `#9ca3af` | gray-400 | — |
| conflict | amber×purple 스트라이프 | `bg-conflict-stripe` | ⚡ |

**레짐 배지**: Goldilocks emerald → Risk-On green → Risk-Off amber → Stagflation orange → Recession red (점진적 강도)

### 4.3 와이어프레임 (Desktop ≥1280px)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ⚠ CRITICAL  VIX > 40 발화 (현재 42.3, 임계 40)      외 2개 활성  [상세][✕]│ ← L1 (red)
│ ★ CRITICAL  BUY_PANIC 발화 (HY OAS 850bp)                       [상세][✕]│ ← L1 (purple)
├─────────────────────────────────────────────────────────────────────────┤
│ [Logo] EconDash  [레짐: Risk-Off ▲]  14:32 KST / 01:32 ET     [🔔3]      │ ← L1 헤더
│                  진입 D+12 / 직전 Risk-On                                │
├──────────────────────────────────────────┬──────────────────────────────┤
│ L2 메인 그리드 (4×2)                       │ L3 우측 사이드바                │
│ ┌───┐┌───┐┌───┐┌───┐                     │ ┌──────────────────────────┐  │
│ │VIX││CPI││T2Y││10Y│  (8개 IndicatorCard)│ │ 알림 피드 (시간 역순)       │  │
│ └───┘└───┘└───┘└───┘                     │ │ ⚠14:30 VIX_PANIC ...     │  │
│ ┌───┐┌───┐┌───┐┌───┐                     │ │ ★14:25 BUY_PANIC ...     │  │
│ │HY ││DXY││KR ││KRW│                      │ │ ▲09:00 KR_EXPORT_WEAK    │  │
│ └───┘└───┘└───┘└───┘                     │ │ [All|Crit|Warn|Info]     │  │
│                                          │ ├──────────────────────────┤  │
│ L3 보조 카드 (스크롤)                       │ │ 📅 발표 일정 (D-7)         │  │
│ PPI / BEI / Cu·Gold / WTI / MOVE / 외국인  │ │ D-2 US Core CPI          │  │
│ ...                                       │ │   21:30 ET / 10:30 KST   │  │
└──────────────────────────────────────────┴──────────────────────────────┘
```

**Tablet (768-1279)**: 2×4 그리드 + 사이드바 하단 이동
**Mobile (<768)**: 1열 적층 + 레짐 sticky top + 알림 별도 탭

### 4.4 위젯 카탈로그 (10종)

1. **IndicatorCard** — 큰 숫자 + 스파크라인 + severity 배지 + 변화율 (Sparkline은 Recharts)
2. **SpreadChart** — 0 기준 양/음 부호별 영역 (T10Y2Y, T10Y3M)
3. **RegimeBadge** — 헤더 inline + 진입 D+N + 직전 레짐
4. **AlertBanner** — sticky top (red/purple/stripe), dismiss 가능
5. **AlertFeed** — 시간 역순 + severity 필터 (All/Critical/Warning/Info)
6. **MultiLineChart** — US 3Y/10Y/30Y 동일 차트 오버레이
7. **DualAxisCard** — 한국 수출 전체 + 반도체 분리
8. **CurrencyCard** — USD/KRW + DXY 보조 (커플드)
9. **CategoryHeatmap** — 6개 카테고리 신호등 한눈에
10. **ReleaseSchedule** — D-day + ET/KST 병기 + 한국 공휴일 처리

### 4.5 알림 표시 패턴

- **상단 배너** (critical만): sticky, 최근 1개 + "외 N개 활성" 링크
- **카드 펄스**: 임계치 crossing 순간 1.5초 1회 (CSS keyframes, 머무는 동안 정적)
- **AlertFeed**: 시간 역순, KST 표기, dismiss 가능
- **CONFLICT**: amber×purple 스트라이프 + ⚡ 배지, 양쪽 룰 모두 표시

### 4.6 한국 투자자 특화

- 모든 시각 **KST 기본 + ET 병기**
- ReleaseSchedule에 "다음날 KOSPI 갭 반영 예상" 안내
- 한국 공휴일 처리: ECOS/KRX 결측 허용, 룰 미발화
- 발표 후 +30분 자동 룰 재평가

### 4.7 접근성

- WCAG AA 대비 충족
- 색상 + 아이콘 + 텍스트 3중 인코딩 (색맹 8% 대응)
- `prefers-reduced-motion` 펄스 비활성
- 다크 모드 지원 + 키보드 네비게이션

---

## 5. 기술 아키텍처

### 5.1 스택 선정 근거

| 영역 | 선택 | 이유 |
|------|------|------|
| 프레임워크 | Next.js 14 App Router | 단일 프로세스로 cron·API·UI 동거, RSC 초기 페이로드↓ |
| 언어 | TypeScript 5.x (strict) | 24 지표 + 17 룰 타입 안전성 |
| 스타일 | Tailwind + shadcn/ui | Phase 4 색상 토큰을 `tailwind.config.ts`에 직접 매핑 |
| 데이터 페치 | TanStack Query (5분 polling) | stale-while-revalidate, 인증 없어 query key 단순 |
| 검증 | Zod | API 응답·환경변수·룰 JSON 검증 |
| 차트 | Recharts | 스파크라인/멀티라인/스프레드/DualAxis 모두 커버 (~80KB) |
| DB | better-sqlite3 (동기) | 단일 사용자 + cron 트랜잭션 단순 |
| 스케줄러 | node-cron (로컬) / Vercel Cron (배포) | 로컬 KST 09:00 1회 |
| 알림 | **인앱만** (DB + polling) | Slack/Email/Push 미구현 |
| 인증 | 없음 (cron만 `CRON_SECRET`) | 혼자 사용 |
| 테스트 | Vitest | 룰/정규화/임계치 80% 커버 |

**의도적 미채택**: framer-motion(CSS keyframes로 충분), Redux/Zustand(서버 상태만), Prisma(raw SQL이 더 단순).

### 5.2 디렉토리 구조 (요약)

```
economyDashboard/
├── src/
│   ├── app/                                # Next.js App Router
│   │   ├── page.tsx                        # 메인 대시보드
│   │   ├── indicator/[id]/page.tsx         # L4 드릴다운
│   │   ├── alerts/page.tsx                 # 알림 히스토리
│   │   └── api/
│   │       ├── indicators/route.ts
│   │       ├── alerts/route.ts
│   │       ├── regime/route.ts
│   │       ├── releases/route.ts
│   │       └── cron/{fetch,evaluate}/route.ts
│   ├── lib/
│   │   ├── sources/                        # fred, ecos, kita, yfinance, stooq + fetchWithFallback
│   │   ├── indicators/                     # 24개 definitions, normalize, thresholds
│   │   ├── signals/                        # rules.json, evaluator, regime, cooldown, styling
│   │   ├── db/                             # client, schema, queries, migrations
│   │   ├── timezone.ts                     # KST/ET 변환
│   │   └── env.ts                          # Zod 검증
│   ├── components/
│   │   ├── widgets/                        # IndicatorCard, SpreadChart 등 10종
│   │   ├── ui/                             # shadcn 컴포넌트
│   │   └── dashboard/                      # DashboardGrid, Header
│   ├── config/                             # indicators/signals/colors 설정
│   └── styles/tailwind.config.ts           # severity/regime 토큰 + pulse keyframes
├── data/timeseries.db                       # SQLite (gitignored)
├── scripts/                                 # backfill, healthcheck, migrate
├── tests/                                   # signals/indicators/api Vitest
└── .env.example / .env.local
```

파일당 200~400줄(상한 800), 비즈니스 로직(`lib/`)과 표현 로직(`components/`) 분리.

### 5.3 핵심 TypeScript 인터페이스

```typescript
export type Severity = 'normal' | 'info' | 'warning' | 'critical-sell' | 'critical-buy' | 'stale' | 'conflict'

export interface IndicatorDef {
  readonly id: string;
  readonly nameKr: string;
  readonly category: Category;
  readonly source: SourceType;
  readonly sourceId: string;
  readonly fallbackSource?: SourceType;
  readonly unit: 'index' | 'pct' | 'bp' | 'usd' | 'krw' | 'ratio';
  readonly thresholds: { normal: [number, number]; watch: [number, number]; alert: [number, number]; direction: 'above' | 'below' };
  readonly updateCadence: 'daily' | 'weekly' | 'monthly';
  readonly releaseTimeET?: string;
}

export interface Signal {
  readonly id: string;
  readonly ruleId: string;
  readonly severity: 'info' | 'warning' | 'critical';
  readonly category: 'recession' | 'inflation' | 'volatility' | 'korea' | 'opportunity';
  readonly type: 'risk' | 'opportunity' | 'conflict';
  readonly triggeredAt: string;
  readonly resolvedAt?: string;
  readonly message: string;
  readonly actionHint: string;
}

export interface RegimeState {
  readonly current: 'goldilocks' | 'risk_on' | 'risk_off' | 'stagflation' | 'recession';
  readonly enteredAt: string;
  readonly previous?: string;
  readonly confidence: number;
}
```

### 5.4 데이터 파이프라인

```
[FRED/ECOS/KITA/yfinance]
   │ HTTPS (API key)
   ▼
[node-cron @ KST 09:00] ─► [/api/cron/fetch] ─► fetchWithFallback ─► SQLite timeseries
                                                                       │
                                                                       ▼
                          [/api/cron/evaluate] ─► evaluator + regime ─► SQLite signals
                                                                       │
                                                                       ▼
[Browser polling 5min] ─► [/api/indicators, /alerts, /regime] ─► UI 위젯
```

### 5.5 SQLite 스키마 (요약)

- `timeseries (indicator_id, as_of, value, source, fetched_at)` — PK (indicator_id, as_of, source)
- `signals (id, rule_id, severity, category, type, triggered_at, resolved_at, message, action_hint, dismissed_at)`
- `regime_history (entered_at, regime, confidence, trigger_summary)`
- `fetch_log (source, indicator_id, fetched_at, success, error, duration_ms)` — 30일+ 실패 감지
- `release_schedule (event_name, country, due_at_et, due_at_kst, importance)`
- `manual_overrides (indicator_id, as_of, value, note)` — KOSPI Fwd EPS 등 수동 입력

### 5.6 운영 시나리오

**(A) 로컬 모드 (기본, 권장)**
- `npm run build && npm start` → node-cron이 KST 09:00 자동 fetch
- 데이터: `./data/timeseries.db` (로컬 영속)
- 비용: $0

**(B) Vercel Hobby + Turso (배포)**
- Vercel Cron 일 2회 (무료 한도) + Turso libSQL (SQLite 호환, 무료 9GB)
- `CRON_SECRET` 헤더 검증
- 비용: $0 (도메인 선택 $10/년)

**(C) GitHub Actions + 정적** — 비추천 (mutation 어려움)

### 5.7 비용

| 항목 | 로컬 | Vercel+Turso |
|------|------|-------------|
| 서버 | $0 | $0 (Hobby) |
| DB | $0 | $0 (Turso 무료) |
| API (FRED/ECOS/KITA) | $0 | $0 |
| 도메인 | $0 | 선택 $10/년 |
| **합계** | **$0/년** | **$0~$10/년** |

---

## 6. 구현 로드맵 (4주)

각 주차 끝에 `npm run test/build/typecheck` 게이트 통과 필수.

### Week 1 — 기반 + 핵심 5지표
- Next.js + TS + Tailwind + shadcn 셋업, `tailwind.config.ts`에 색상 토큰
- SQLite 스키마 + 마이그레이션
- `lib/sources/fred.ts` (재시도 + rate limit)
- `lib/indicators/definitions.ts` 24개 메타데이터
- IndicatorCard 위젯 + Recharts 스파크라인
- 메인 5개 카드 (VIX, T10Y2Y, US 10Y, Core CPI, HY OAS) + 1년 백필
- Vitest 셋업, `normalize.spec.ts` 80%

### Week 2 — 한국 데이터 + 단일 룰 + AlertFeed
- `lib/sources/ecos.ts` (환율/금리) + `kita.ts` (산업부 스크래핑 + 수동 폴백)
- `lib/sources/yfinance.ts` + `stooq.ts` + `fetchWithFallback.ts`
- evaluator DSL 파서 + cooldown 168h/720h
- 11개 단일 룰 평가 + 저장
- AlertFeed/SpreadChart/CurrencyCard/DualAxisCard 위젯
- `evaluator.spec.ts` 11개 케이스

### Week 3 — 복합 시그널 + 레짐 + sticky 배너
- evaluator AND/OR 확장 (`_60dMA`, `_3MStreak`, `_6Msustained`, `_unInversion`)
- 6개 복합 룰 + 5개 레짐 분류
- RegimeBadge + AlertBanner + priority_policy
- 매수/매도 CONFLICT 처리 (양쪽 병기 + ⚡)
- 카드 펄스 keyframes
- `regime.spec.ts`, `cooldown.spec.ts`, `conflict.spec.ts`

### Week 4 — 반응형 + L4 + 마무리
- 반응형 그리드 (1280/768/<768) + 모바일 bottom tab
- `app/indicator/[id]/page.tsx` 드릴다운 + `app/alerts/page.tsx`
- ReleaseSchedule + 다크 모드 + 접근성 (WCAG AA)
- `scripts/healthcheck.ts` 소스 가용성 점검
- README + 배포 가이드 + Playwright E2E 1~2개

---

## 7. 리스크와 한계

| 리스크 | 영향 | 완화 |
|-------|------|------|
| **yfinance 비공식 API** | KOSPI/MOVE 일중 끊김 | Stooq CSV 폴백 + FRED 동등 시리즈 자동 전환 + 30일+ 실패 시 인앱 안내 |
| **KITA/산업부 HTML 파싱** | 발표 양식 변경 시 깨짐 | 정규식 + `manual_overrides` 수동 입력 폴백 |
| **KOSPI Fwd EPS 부재** | 한국 EPS 시그널 정확도↓ | 한국 수출 YoY 프록시 (룰 4개에 반영) + 디커플링 사례 명시 |
| **시그널 false positive** | 잦은 알림으로 신뢰도↓ | rationale + false_positive_note + 조합 시그널 + 7~30일 cooldown |
| **백테스트 미실시** | historical_triggers 추정치 | Phase 5 데이터 수집 후 실제 백테스트로 검증 (Week 4 이후) |
| **ECOS 통계표 코드 개편** | 한국 데이터 단절 | 구현 단계에서 ECOS UI 재확인 + `fetch_log` 모니터 |
| **SQLite 동시 쓰기** | 다중 사용자 시 한계 | 본 프로젝트는 단일 사용자 → 무관. 확장 시 Postgres 마이그레이션 경로 보장 |
| **자동 결론 위험** | 사용자가 알림을 맹신 | CONFLICT 시 양쪽 병기, action_hint는 "검토" 동사로 일관 |

### 7.1 본 설계가 약속하지 않는 것

- **단기 매매 시그널**: 중기 시간축 사용자 대상, 일중 변동에는 부적합
- **자동 매매 트리거**: 모든 행동 힌트는 "검토" 수준, 자동 주문 연동 없음
- **백테스트 검증된 수익률**: 학술·역사 사례 기반이지만 실증 백테스트는 추후 작업
- **북한/지정학 이벤트**: 정량화 어려움, 별도 뉴스 패널 권장
- **개별 종목 추천**: 거시 레짐 + 자산군 비중 가이드까지만

---

## 8. 다음 단계 옵션

설계 완료 — 다음 중 하나로 진행 권장:

1. **즉시 구현 착수 (4주 풀스택)**: Week 1부터 시작. 첫 산출물은 5개 카드 메인 표시.
2. **PoC 먼저 (Streamlit, 1~2일)**: FRED API와 핵심 5개 지표만 빠르게 검증. 가치 확인 후 풀스택 전환.
3. **설계 추가 라운드**: 백테스트 모듈 / 자산 배분 자동화 / 외부 알림 채널(추후) 등 특정 부분 심화.
4. **API 키 발급 + 환경 셋업만 먼저**: FRED, ECOS 키 발급하고 `.env.local` 준비, 구현은 별도 시점.

---

## 부록 — 산출물 인덱스

| 파일 | 담당 | 내용 |
|------|------|------|
| `_workspace/00_brief.md` | 오케스트레이터 | 사용자 brief (시간축, 자산군, 알림, 운영) |
| `_workspace/01_analyst_indicators.md` | macro-indicator-analyst | 23개 지표 카탈로그 + 메인 뷰 8개 |
| `_workspace/02_datasource_mapping.md` | data-source-mapper | 24개 지표 ↔ 소스 매핑 + API 가이드 |
| `_workspace/03_signal_rules.json` | signal-rule-designer | 17개 룰 + 5개 레짐 (구현 입력) |
| `_workspace/03_signal_rules.md` | signal-rule-designer | 룰 사람 친화적 설명 |
| `_workspace/04_ux_design.md` | dashboard-ux-designer | UX 와이어프레임 + 위젯 카탈로그 + 색상 토큰 |
| `_workspace/05_tech_architecture.md` | dashboard-tech-architect | 디렉토리 구조 + 스키마 + 4주 로드맵 |
| `.claude/agents/*.md` | 오케스트레이터 | 5인 에이전트 정의 |
| `.claude/skills/*/skill.md` | 오케스트레이터 | 6개 스킬 (오케스트레이터 + 5개 도메인) |

향후 구현 단계에서 본 문서가 단일 청사진(single source of truth). `_workspace/` 산출물은 상세 참조용으로 보존.
