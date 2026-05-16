---
name: dashboard-tech-stack
description: "투자 대시보드 기술 스택 옵션 비교 및 권장 아키텍처. Next.js/Streamlit/하이브리드 트랙, 데이터 파이프라인, 캐싱, 알림 채널. 트리거: 기술 스택, 프레임워크, 아키텍처."
---

# Dashboard Tech Stack — 기술 스택 옵션

## 워크플로우

### 1. 3가지 트랙 비교

| 트랙 | 스택 | 장점 | 단점 | 적합한 경우 |
|------|------|------|------|----------|
| **PoC** | Streamlit + Python | 1~2일 완성, 데이터 처리 친화 | 커스텀 UI 한계, 동시접속 약함 | 혼자 쓰는 프로토타입 |
| **풀스택 (권장)** | Next.js 14 + TS + Tailwind + SQLite | 확장성, UX 자유도, Vercel 배포 | 초기 셋업 비용 | 장기 운영, 향후 모바일 PWA |
| **하이브리드** | Next.js 프론트 + FastAPI 백엔드 | 무거운 계산 분리, Python 라이브러리 활용 | 인프라 2개 관리 | 머신러닝/백테스트 결합 시 |

### 2. 권장 스택 (풀스택 트랙)

**프레임워크**: Next.js 14 App Router  
**언어**: TypeScript  
**스타일**: Tailwind CSS + shadcn/ui  
**상태/페치**: TanStack Query  
**차트**: Recharts (간단) 또는 Visx (커스텀 필요 시)  
**DB**: SQLite (`better-sqlite3`) — 단일 사용자 충분, 추후 Postgres 마이그레이션 가능  
**스케줄러**: Vercel Cron (무료 일 2회) 또는 GitHub Actions (무료, 더 유연)  
**알림**: Web Push API + Slack webhook + Resend(이메일)  
**검증**: Zod  
**배포**: Vercel (무료 hobby) 또는 Cloudflare Pages

### 3. 디렉토리 구조 표준

```
economyDashboard/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # 메인 대시보드
│   │   ├── layout.tsx
│   │   ├── alerts/page.tsx             # 알림 히스토리
│   │   ├── indicators/[id]/page.tsx    # 개별 지표 상세
│   │   └── api/
│   │       ├── indicators/route.ts
│   │       ├── alerts/route.ts
│   │       └── cron/
│   │           ├── fetch/route.ts      # 데이터 수집
│   │           └── evaluate/route.ts   # 시그널 평가
│   ├── lib/
│   │   ├── sources/
│   │   │   ├── fred.ts
│   │   │   ├── ecos.ts
│   │   │   ├── kita.ts
│   │   │   └── yfinance.ts
│   │   ├── indicators/
│   │   │   ├── definitions.ts          # 메타데이터
│   │   │   └── normalize.ts            # 공통 정규화
│   │   ├── signals/
│   │   │   ├── rules.json              # 룰 정의
│   │   │   ├── evaluator.ts            # 룰 평가 엔진
│   │   │   └── regime.ts               # 레짐 분류
│   │   ├── db/
│   │   │   ├── schema.sql
│   │   │   └── queries.ts
│   │   └── notify/
│   │       ├── webpush.ts
│   │       ├── slack.ts
│   │       └── email.ts
│   ├── components/
│   │   ├── widgets/
│   │   │   ├── IndicatorCard.tsx
│   │   │   ├── RegimeBadge.tsx
│   │   │   ├── AlertFeed.tsx
│   │   │   ├── SparkLine.tsx
│   │   │   └── SpreadChart.tsx
│   │   └── ui/                         # shadcn 컴포넌트
│   └── config/
│       ├── indicators.config.ts
│       └── signals.config.ts
├── data/
│   └── timeseries.db                   # gitignored
├── tests/
│   └── signals.spec.ts
├── .env.example
├── .env.local                          # gitignored
└── package.json
```

### 4. 데이터 파이프라인 다이어그램

```
[FRED/ECOS/KITA/Yahoo]
      │ (HTTPS GET, API key)
      ▼
[Vercel Cron 또는 GH Actions] (1일 1회 또는 5분)
      │
      ▼
[/api/cron/fetch] — 각 소스별 fetcher 호출
      │
      ▼
[SQLite timeseries 테이블] (id, asOf, value, source)
      │
      ▼
[/api/cron/evaluate] — 시그널 룰 평가
      │
      ├──► [alerts 테이블] insert
      └──► [notify channels] Web Push / Slack / Email
            
[프론트엔드]
      │ (5분 polling 또는 수동 새로고침)
      ▼
[/api/indicators] [/api/alerts]
      │
      ▼
[Dashboard UI — IndicatorCard, AlertFeed, etc]
```

### 5. 핵심 타입 정의

```typescript
// indicators/definitions.ts
export interface IndicatorDef {
  id: string;
  name: string;
  category: 'volatility' | 'inflation' | 'rates' | 'korea' | 'global' | 'credit';
  source: 'fred' | 'ecos' | 'kita' | 'yfinance' | 'stooq';
  sourceId: string;
  unit: string;
  thresholds: { normal: [number, number]; watch: [number, number]; alert: [number, number] };
  inverted?: boolean; // true if lower = worse
  updateCadence: 'realtime' | 'daily' | 'weekly' | 'monthly';
}

// signals/evaluator.ts
export interface Signal {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  indicators: string[];
  evaluate: (values: Record<string, IndicatorValue>) => boolean;
  cooldownHours: number;
  rationale: string;
}
```

### 6. 환경변수 표준

```bash
FRED_API_KEY=
ECOS_API_KEY=
ALPHA_VANTAGE_KEY=
SLACK_WEBHOOK_URL=
RESEND_API_KEY=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
```

### 7. 구현 로드맵 (4주)

- **Week 1**: 셋업 + FRED fetcher + 핵심 5개 지표 카드 표시
- **Week 2**: 한국 데이터(ECOS/KITA) + 알림 피드 + DB 캐싱
- **Week 3**: 시그널 룰 엔진 + 레짐 분류 + 알림 채널 (Slack)
- **Week 4**: 반응형 + 개별 지표 페이지 + 배포

## 비용 추정 (개인 사용)

- Vercel Hobby: $0 (대역폭/호출 무료 한도 내)
- 도메인: 선택, $10/년
- 외부 API: 모두 무료 한도 사용 가능
- 총: **$0~$15/년**

## 출력 규칙

`_workspace/05_tech_architecture.md`에 위 내용을 사용자 요구사항에 맞춰 조정해 작성.
