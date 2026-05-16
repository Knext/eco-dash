# 대시보드 UX 설계 (Phase 4)

작성일: 2026-05-16
담당: dashboard-ux-designer
대상: 한국 투자자 (중기 시간축), 한국 + 미국 + 글로벌 ETF/채권 3개 자산군, 인앱 알림만, 개인 사용

전제 인계물:
- Phase 1 메인 뷰 후보 8개: VIX, Core CPI, T10Y2Y, US 10Y(+3Y/30Y), HY OAS, DXY, 한국 수출, USD/KRW
- Phase 3 시그널 17개 + 레짐 5개 + critical 매도/매수 색상 분리 요구사항

---

## 0. 설계 원칙

본 대시보드는 **"한눈에 80% 정보 + 임계치 알림"** 사용자 요구를 1순위로 설계한다. Bloomberg Terminal의 정보 밀도, TradingView의 시각적 명료성, FRED의 데이터-잉크 비율을 차용하되, 개인 사용자 환경에 맞게 단순화한다.

1. **한눈에 80%**: 인터랙션(클릭/스크롤) 없이 핵심 정보 80% 노출. 데스크탑 fold 위에 레짐 + 8개 카드 + 활성 critical 알림이 모두 보여야 함.
2. **데이터-잉크 비율 최대화**: Tufte 원칙. 그리드선·장식·과도한 보더 제거. 모든 픽셀은 데이터 표현에 기여.
3. **색상 + 아이콘 + 텍스트 3중 인코딩**: 색맹 사용자(전 인구 8% 남성)와 다크모드 대비. 색상 의미는 아이콘과 라벨로 항상 보강.
4. **한국 투자자 관점**: 모든 시간은 KST 기본 + ET 병기. 환율(USD/KRW)은 메인 패널 고정. CPI/FOMC 발표 시점은 KST 새벽 → 다음날 KOSPI 갭이라는 사실을 발표 일정 위젯이 명시.
5. **노이즈 < 시그널**: Phase 3 cooldown 정책(7~30일)을 UX에서도 강화. 임계치를 "넘는 순간"만 펄스, 머무는 동안은 정적 표시.
6. **자동 결론 금지**: 매수/매도 충돌(CONFLICT) 발생 시 시스템이 결론 내리지 않고 양쪽 시그널 병기. 사용자가 최종 판단.

---

## 1. 정보 위계 (4단계)

| 레벨 | 위치 | 내용 | 인터랙션 |
|------|------|------|---------|
| **L1** (영구 노출) | 헤더 sticky + 배너 sticky | 현재 레짐 배지 + 활성 critical 알림 배너 | 알림 dismiss만 가능 |
| **L2** (스크롤 없이) | 메인 그리드 4×2 | 8개 핵심 지표 카드 (VIX/CPI/T10Y2Y/US10Y/HY OAS/DXY/한국수출/USDKRW) | 카드 hover → tooltip |
| **L3** (스크롤/탭) | 메인 그리드 아래 + 우측 사이드바 | 보조 카드 (PPI, BEI, Copper/Gold, WTI 등), 알림 피드, 발표 일정 | 카드 클릭 → 상세 |
| **L4** (드릴다운) | 별도 페이지 (`/indicator/{id}`) | 개별 지표 상세: 장기 차트, 임계치 히스토리, 관련 룰, 룰 발화 이력 | 차트 줌/팬, 기간 선택 |

L1은 항상 화면에 고정. L2까지는 1280px 데스크탑에서 fold 위에 모두 보여야 함. L3는 스크롤 1회, L4는 명시적 네비게이션.

---

## 2. 컬러 토큰

Phase 3에서 명시된 "매도 critical = 빨강, 매수 critical = 보라" 색상 분리를 엄격히 준수한다. 이는 사용자 행동을 반전시키지 않기 위한 핵심 결정이다.

### 2.1 Severity 색상

| 상태 | HEX (라이트) | Tailwind 클래스 | 아이콘 | 의미 |
|------|-----------|---------------|-------|------|
| normal | `#10b981` | `bg-emerald-500 text-emerald-50` | `●` (CircleDot) | 정상 범위 |
| info | `#6b7280` | `bg-slate-500 text-slate-50` | `ℹ` (Info) | 정보 제공, 행동 불요 |
| warning | `#f59e0b` | `bg-amber-500 text-amber-50` | `▲` (AlertTriangle) | 1주 내 점검 |
| critical (매도/리스크) | `#ef4444` | `bg-red-500 text-red-50` | `⚠` (AlertOctagon) | 즉각 방어 행동 |
| critical (매수기회) | `#a855f7` | `bg-purple-500 text-purple-50` | `★` (Sparkles) | 즉각 매수 검토 |
| stale | `#9ca3af` | `bg-gray-400 text-gray-50` | `—` (Minus) | 데이터 갱신 지연 |
| conflict | 스트라이프(`amber-500` × `purple-500`) | `bg-conflict-stripe` | `⚡` (Zap) | 매수+매도 동시 발화 |

다크 모드에서는 채도를 약간 낮춘 톤 사용 (Tailwind 400 등급). 카드 보더와 배경 모두에 동일 색상 적용.

### 2.2 레짐 배지 색상

| 레짐 | 배경 (라이트) | 텍스트 | 다크 모드 배경 | 시사 |
|------|-----------|-------|-------------|------|
| **Goldilocks** | `bg-emerald-100` | `text-emerald-800` | `bg-emerald-900/40 text-emerald-200` | 가장 우호 (성장↑ 인플레↓) |
| **Risk-On** | `bg-green-100` | `text-green-800` | `bg-green-900/40 text-green-200` | 회복·확장기 |
| **Risk-Off** | `bg-amber-100` | `text-amber-800` | `bg-amber-900/40 text-amber-200` | 변동성 확대, 방어 |
| **Stagflation** | `bg-orange-100` | `text-orange-800` | `bg-orange-900/40 text-orange-200` | 성장↓ 인플레↑ |
| **Recession** | `bg-red-100` | `text-red-800` | `bg-red-900/40 text-red-200` | 수축기 |

Goldilocks의 emerald와 Risk-On의 green은 의도적으로 인접 색상으로 두어, 양호한 레짐 간 연속성을 시각적으로 표현. Risk-Off(amber)와 Stagflation(orange)는 경계 단계로 묶이되 강도 차이 표현. Recession은 단독으로 빨강.

### 2.3 기타 토큰

- **카드 배경**: 라이트 `bg-white`, 다크 `bg-gray-900`
- **카드 보더**: 라이트 `border-gray-200`, 다크 `border-gray-700`. severity 발화 시 해당 색상으로 변경.
- **본문 텍스트**: 라이트 `text-gray-900`, 다크 `text-gray-100`
- **보조 텍스트**: 라이트 `text-gray-500`, 다크 `text-gray-400` (갱신 시각, 단위 표기 등)
- **숫자 표시**: `font-mono tabular-nums` — 단조 폰트로 정렬. 큰 지표값은 `text-3xl font-semibold tracking-tight`
- **차트 색상**: 라인 1차 `#3b82f6` (blue-500), 2차 `#8b5cf6` (violet-500), 3차 `#f97316` (orange-500). 0 기준선 `#9ca3af` (gray-400).
- **임계치 호리즌탈 라인**: `border-dashed border-amber-400` (경계), `border-dashed border-red-400` (위험)

---

## 3. 와이어프레임 (ASCII)

### 3.1 Desktop (≥1280px)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  ⚠ CRITICAL  VIX > 40 발화 (현재 42.3, 임계 40)        외 2개 활성    [상세] [✕] │ ← L1 sticky 배너 (red)
│  ★ CRITICAL  BUY_PANIC 발화 (HY OAS 850bp)                          [상세] [✕] │ ← L1 sticky 배너 (purple)
├─────────────────────────────────────────────────────────────────────────────────┤
│ [Logo] EconDash    [레짐: Risk-Off ▲]   2026-05-16 14:32 KST / 01:32 ET  [🔔3]│ ← L1 헤더 sticky
│                    진입 D+12 / 직전 Risk-On                                     │
├──────────────────────────────────────────┬──────────────────────────────────────┤
│ L2 메인 그리드 (4×2)                       │ L3 우측 사이드바                       │
│                                          │                                       │
│ ┌──────────┐┌──────────┐┌──────────┐┌──┐│ ┌───────────────────────────────────┐│
│ │ ⚠ VIX    ││ ▲ CoreCPI││ ▲ T10Y2Y ││US││ │  알림 피드 (시간 역순)              ││
│ │ 42.3     ││ 3.8%     ││ -0.42%   ││3Y││ │ ┌─────────────────────────────────┐││
│ │ +5.2 ▲   ││ +0.1 ▲   ││ -0.05 ▼  ││10││ │ │⚠ 14:30 VIX_PANIC               │││
│ │ ╱╲╱⌐╱╲   ││ ─────╱─  ││ ▔▔▔╲___  ││30││ │ │  VIX 42.3 (임계 40)            │││
│ │ ──30─40─ ││ ─2%─4%── ││ ───0──── ││Y ││ │ │  [상세]                         │││
│ │ 14:30 KST││ 월 발표  ││ 14:30    ││  ││ │ ├─────────────────────────────────┤││
│ └──────────┘└──────────┘└──────────┘└──┘│ │ │★ 14:25 BUY_PANIC                │││
│ ┌──────────┐┌──────────┐┌──────────┐┌──┐│ │ │  HY OAS 850bp + SPX -18%       │││
│ │ ⚠ HY OAS ││ ▲ DXY    ││ ⚠ KR수출 ││US││ │ │  [상세]                         │││
│ │ 850 bp   ││ 106.2    ││ -8.3% YoY││D ││ │ ├─────────────────────────────────┤││
│ │ +35 ▲    ││ +0.4 ▲   ││ 반도체-12││/K││ │ │▲ 09:00 KR_EXPORT_WEAK          │││
│ │ ╱╲╱─╱╲╱  ││ ▁▂▃▅█▆▇  ││ ╲─╲╲─╲   ││RW││ │ │  수출 -8.3% (임계 -5%)         │││
│ │ ─600─800─││ ─100─105─││ ─0%──-5%─││  ││ │ ├─────────────────────────────────┤││
│ │ 14:30    ││ 14:30    ││ 09:00    ││  ││ │ │ℹ 14:30 DXY_STRONG              │││
│ └──────────┘└──────────┘└──────────┘└──┘│ │ │  DXY 106.2 (임계 105)          │││
│                                          │ │ └─────────────────────────────────┘││
│ L3 보조 카드 (스크롤 시작)                │ │  필터: [All] Critical Warning Info ││
│ ┌──────────┐┌──────────┐┌──────────┐    │ └───────────────────────────────────┘│
│ │ PPI YoY  ││ BEI 10Y  ││ Cu/Gold  │    │ ┌───────────────────────────────────┐│
│ │ 2.8%     ││ 2.65%    ││ 0.182    │    │ │ 📅 발표 일정 (D-7 까지)             ││
│ │ ─────    ││ ─────    ││ ─────    │    │ │ ─────────────────────────────────  ││
│ └──────────┘└──────────┘└──────────┘    │ │ D-2 US Core CPI (5/12)            ││
│ ┌──────────┐┌──────────┐┌──────────┐    │ │   21:30 ET / 5/13 10:30 KST       ││
│ │ WTI      ││ MOVE     ││ 외국인   │    │ │ ─────────────────────────────────  ││
│ │ $78.5    ││ 118      ││ -2,400억 │    │ │ D-5 FOMC (5/15)                   ││
│ │ ─────    ││ ─────    ││ ─────    │    │ │   14:00 ET / 5/16 03:00 KST       ││
│ └──────────┘└──────────┘└──────────┘    │ │ ─────────────────────────────────  ││
│                                          │ │ D-7 KR 수출 잠정 (5/21)            ││
│ L3 카테고리 히트맵 (요약)                  │ │   09:00 KST                       ││
│ 변동성 ⚠  인플레 ▲  금리 ▲  신용 ⚠       │ └───────────────────────────────────┘│
│ 한국 ▲    환율 ℹ                          │                                       │
└──────────────────────────────────────────┴──────────────────────────────────────┘
```

### 3.2 Tablet (768~1279px)

```
┌────────────────────────────────────────────────────────────┐
│ ⚠ CRITICAL VIX > 40 (외 2개)              [상세] [✕]      │
├────────────────────────────────────────────────────────────┤
│ EconDash  [레짐: Risk-Off ▲] D+12  14:32 KST    [🔔3]    │
├────────────────────────────────────────────────────────────┤
│ L2 메인 그리드 (2×4)                                        │
│ ┌──────────────┐  ┌──────────────┐                         │
│ │ ⚠ VIX 42.3   │  │ ▲ Core CPI   │                         │
│ │ +5.2 ▲       │  │ 3.8% YoY     │                         │
│ │ sparkline    │  │ sparkline    │                         │
│ └──────────────┘  └──────────────┘                         │
│ ┌──────────────┐  ┌──────────────┐                         │
│ │ ▲ T10Y2Y     │  │ US 10Y 4.32% │                         │
│ │ -0.42%       │  │ (+3Y/30Y)    │                         │
│ └──────────────┘  └──────────────┘                         │
│ ┌──────────────┐  ┌──────────────┐                         │
│ │ ⚠ HY OAS     │  │ ▲ DXY        │                         │
│ │ 850 bp       │  │ 106.2        │                         │
│ └──────────────┘  └──────────────┘                         │
│ ┌──────────────┐  ┌──────────────┐                         │
│ │ ⚠ KR 수출    │  │ ▲ USD/KRW    │                         │
│ │ -8.3% YoY    │  │ 1,378        │                         │
│ └──────────────┘  └──────────────┘                         │
├────────────────────────────────────────────────────────────┤
│ L3 알림 피드 (하단 섹션, 접힘/펼침)                          │
│ ⚠ 14:30 VIX_PANIC | ★ 14:25 BUY_PANIC | ▲ 09:00 KR_EXPORT │
│ [더보기]                                                    │
├────────────────────────────────────────────────────────────┤
│ L3 발표 일정 + 보조 카드 (스크롤)                            │
└────────────────────────────────────────────────────────────┘
```

### 3.3 Mobile (<768px)

```
┌──────────────────────────────┐
│ ⚠ VIX_PANIC (외 2)  [✕]      │ ← sticky 배너
├──────────────────────────────┤
│ [레짐: Risk-Off ▲] D+12      │ ← sticky 신호등
├──────────────────────────────┤
│ ┌──────────────────────────┐ │
│ │ ⚠ VIX            42.3   │ │ ← 카드 1열
│ │ +5.2 ▲    sparkline      │ │
│ │ 14:30 KST                │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ ▲ Core CPI       3.8%   │ │
│ │ +0.1 ▲    sparkline      │ │
│ │ 월 발표 (D-2)             │ │
│ └──────────────────────────┘ │
│ ...(스크롤)                  │
├──────────────────────────────┤
│ [메인 | 알림 | 발표 | 설정]   │ ← bottom tab
└──────────────────────────────┘
```

모바일에서 알림 피드는 별도 탭. 메인 화면은 레짐 + 카드만으로 단순화.

---

## 4. 위젯 카탈로그

### 4.1 IndicatorCard (Sparkline)

- **용도**: 단일 수치 + 30~90일 추세를 한눈에
- **입력**: `{ value, prevValue, sparklineData, thresholds: [warn, alert], severity, lastUpdatedAt, unit }`
- **시각화**: 큰 숫자 (text-3xl tabular-nums) + 일일/월별 변화 아이콘 + 스파크라인(SVG 80×24px) + 임계치 호리즌탈 라인
- **상호작용**: hover → 임계치 룰 tooltip, click → L4 상세 페이지
- **사용처**: VIX, Core CPI, HY OAS, DXY, PPI, BEI, MOVE, WTI

### 4.2 SpreadChart

- **용도**: 0을 기준으로 양/음을 영역 차트로 강조
- **입력**: `{ data: [{ date, value }], threshold: 0, lookbackDays: 90 }`
- **시각화**: 0 위는 emerald-200 영역 채움, 0 아래는 red-200 영역 채움. 현재값 큰 숫자로 우측 상단.
- **사용처**: T10Y2Y, T10Y3M

### 4.3 RegimeBadge

- **용도**: 현재 거시 레짐 + 진입 시점 + 직전 레짐 한눈에
- **입력**: `{ current, enteredAt, previous }`
- **시각화**: pill 형태 배지 + "D+N" 일수 표기 + 직전 레짐 작은 글씨
- **상호작용**: click → 레짐 진입 히스토리 모달 (지난 1년 레짐 변화 timeline)
- **사용처**: 헤더 sticky

### 4.4 AlertBanner

- **용도**: 활성 critical 알림 sticky 상단 표시
- **입력**: `{ alerts: CriticalAlert[], dismissedIds: string[] }`
- **시각화**:
  - 매도형 critical → red-500 배경 + ⚠ 아이콘
  - 매수형 critical → purple-500 배경 + ★ 아이콘
  - 둘 다 활성 → 스트라이프 배경 + ⚡ CONFLICT 배지
- **상호작용**: 우측 dismiss 버튼 (해당 룰의 cooldown 끝까지 숨김), "외 N개 활성" 링크 → 알림 피드로 점프
- **동시 발생**: 가장 최근 1개만 상단 표시, 나머지는 "외 N개 활성"으로 축약
- **사용처**: 최상단 sticky

### 4.5 AlertFeed

- **용도**: 시간 역순 알림 목록
- **입력**: `{ alerts: Alert[], filter: 'all' | 'critical' | 'warning' | 'info' }`
- **시각화**: severity 아이콘 + 발생 시각 (KST) + 룰 한글 이름 + 현재값 vs 임계치 + 행동 힌트 1줄
- **상호작용**:
  - 필터 칩 (All / Critical / Warning / Info)
  - 항목 클릭 → 관련 지표 카드 하이라이트 + L4 상세
  - 항목 dismiss (오른쪽 스와이프 또는 ✕)
- **사용처**: 데스크탑 우측 사이드바, 태블릿/모바일 별도 탭

### 4.6 MultiLineChart

- **용도**: 동일 단위의 다지표 오버레이
- **입력**: `{ series: [{ name, data, color }], thresholds?: [] }`
- **시각화**: 3개 라인 (US 3Y/10Y/30Y), 우측에 현재값 라벨, 범례 상단
- **사용처**: US Yield Curve (3Y/10Y/30Y) 한 카드에 통합

### 4.7 DualAxisCard

- **용도**: 두 시계열을 좌·우 축으로 동시 표시
- **입력**: `{ primary: { name, data, axis: 'left' }, secondary: { name, data, axis: 'right' } }`
- **시각화**: 전체 수출 YoY (좌축 막대) + 반도체 수출 YoY (우축 라인). 0% 기준선 강조.
- **사용처**: 한국 수출 (전체 + 반도체 분리)

### 4.8 CurrencyCard

- **용도**: 환율 + 보조 지표(DXY) 커플드 표시
- **입력**: `{ rate, change, dxyValue, dxyChange, thresholds }`
- **시각화**: 큰 숫자 USD/KRW + 일일 변화 + 하단 미니 DXY 스파크라인 + 두 지표의 상관성 미니 시각화
- **사용처**: USD/KRW 카드

### 4.9 CategoryHeatmap (보조)

- **용도**: 6개 카테고리(변동성/인플레/금리/신용/한국/환율)의 신호등 한눈에
- **입력**: `{ categories: [{ name, worstSeverity, ruleCount }] }`
- **시각화**: 6개 작은 박스, 각 카테고리에서 가장 심각한 severity 색상 + 활성 룰 개수
- **사용처**: 메인 그리드 하단 또는 모바일 탭

### 4.10 ReleaseSchedule

- **용도**: 향후 1주 매크로 발표 일정 (한국 투자자 시간대 특화)
- **입력**: `{ events: [{ name, dueAt, etTime, kstTime, country, importance }] }`
- **시각화**: D-day 표기 + 이벤트 이름 + ET/KST 병기 + 국가 플래그 아이콘
- **상호작용**: 발표 시점 도래 시 자동 알림 평가 트리거 (Phase 5 인계)
- **사용처**: 우측 사이드바 하단

---

## 5. 8개 메인 카드 위젯 매핑

| # | 지표 | 위젯 타입 | 표시 정보 | 임계치 시각화 |
|---|------|---------|----------|------------|
| 1 | **VIX** | IndicatorCard | 현재값 + 1일 변화 + 30일 스파크라인 | 30(amber)/40(red) 호리즌탈 라인 |
| 2 | **Core CPI YoY** | IndicatorCard | YoY 큰 숫자 + MoM 보조 + 12개월 추이 | 2.5%(amber)/4%(red) 라인 |
| 3 | **T10Y2Y 스프레드** | SpreadChart | 양/음 영역 차트 + 현재 bp | 0(red 강조) 라인 |
| 4 | **US 10Y (+3Y/30Y)** | MultiLineChart | 3개 곡선 + 각 현재값 라벨 | — |
| 5 | **HY OAS** | IndicatorCard | bp 단위 + 90일 스파크 | 600(amber)/800(purple, 매수기회) 라인 |
| 6 | **DXY** | IndicatorCard | 지수값 + 변화율 + 60일 스파크 | 100(amber)/105(red) 라인 |
| 7 | **한국 수출 YoY** | DualAxisCard | 전체(막대) + 반도체(라인) | 0%(중립)/-5%(amber)/-10%(red) |
| 8 | **USD/KRW** | CurrencyCard | 환율 + 일일 변화 + DXY 보조 | 1300(amber)/1350(red) |

HY OAS의 800bp는 매수기회(BUY_PANIC, HY_OAS_PANIC) 트리거이므로 임계 라인을 보라색으로 표시. 시각적 비대칭이 사용자에게 "이건 매도가 아니라 매수 신호"를 즉각 전달.

---

## 6. 알림 표시 패턴

### 6.1 상단 배너 (Critical만)

- **위치**: viewport 최상단 sticky (헤더 위)
- **색상**:
  - 매도형 critical → red-500 배경
  - 매수형 critical → purple-500 배경
  - CONFLICT → amber-500 × purple-500 사선 스트라이프
- **표시 내용**: 아이콘 + 룰 한글 이름 + 현재값 + "상세" 버튼 + dismiss(✕)
- **동시 발생**: 가장 최근 트리거 1개만 표시, "외 N개 활성" 링크. 클릭 시 알림 피드로 스크롤.
- **Dismiss 동작**: 해당 룰의 cooldown 끝까지 숨김 (재발화 시 재표시). LocalStorage에 dismissedRuleIds 저장.

### 6.2 카드 펄스 애니메이션

- **트리거**: 임계치를 "넘는 순간"(threshold crossing) 1회만
- **효과**: 카드 외곽 보더 1.5초 펄스 (CSS keyframes `box-shadow` 확장→축소)
- **머무는 동안**: 정적 표시 (severity 색상 보더 유지, 펄스 없음). 노이즈 방지.
- **CSS**:
  ```css
  @keyframes pulse-severity {
    0%   { box-shadow: 0 0 0 0 var(--severity-color); }
    70%  { box-shadow: 0 0 0 8px transparent; }
    100% { box-shadow: 0 0 0 0 transparent; }
  }
  ```

### 6.3 알림 피드 (메인 화면 우측 사이드바 또는 별도 탭)

- **정렬**: 시간 역순 (KST)
- **항목 구성**: severity 아이콘 + KST 시각 + 룰 한글 이름 + 현재값 vs 임계치 + 행동 힌트 1줄 + [상세] / [✕]
- **필터 칩**: All (기본) / Critical / Warning / Info — 토글 시 즉시 적용
- **카테고리 그룹**: 같은 카테고리에 critical과 warning 동시 발화 시 critical만 표시 (Phase 3 정책 반영)
- **무한 스크롤**: 최근 30일치 로드, 그 이상은 별도 페이지

### 6.4 알림 충돌 (CONFLICT) 처리

- **트리거 조건**: 같은 시간대에 매수형 critical(BUY_PANIC, HY_OAS_PANIC, EARLY_RECOVERY)과 매도형 critical(VIX_PANIC, RECESSION_COMPOSITE, KR_EXPORT_CRASH 등) 동시 활성
- **시각화**:
  - 배너에 ⚡ CONFLICT 배지 (amber × purple 스트라이프)
  - 양쪽 룰을 별도 카드로 병기, 한쪽이 다른 쪽을 숨기지 않음
  - "역사적으로 본 조합은 패닉 바닥권 신호. 시스템이 결론을 내리지 않음." 안내 문구
- **자동 결론 금지**: 시그널 엔진이 어느 쪽이 우세한지 판정하지 않음. 사용자가 컨텍스트(레짐, 보유 자산)로 판단.

---

## 7. 발표 일정 위젯 (한국 투자자 특화)

ReleaseSchedule 위젯은 한국 투자자의 시간대 특수성을 반영한다.

- **표시 항목**: D-day 카운트 + 이벤트명 + 국가 플래그 + ET 시각 + KST 시각 (병기)
- **예시 표기**:
  ```
  D-2  US Core CPI (CPIAUCSL)
        2026-05-12  08:30 ET  →  21:30 KST 발표
        (다음날 KOSPI 갭 반영 예상)
  ```
- **이벤트 종류**: US CPI/Core CPI/PPI, FOMC + SEP, US 고용지표, 한국 수출입(매월 1일 KST 09:00), 한국 금통위, ECB
- **발표 후 자동 트리거**: 발표 시각 +30분 후 시그널 엔진이 룰 재평가 (Phase 5 인계). 새 룰 발화 시 카드 펄스 + 배너 표시.
- **공휴일 처리**: 한국 공휴일에 KR 데이터 발표 없을 경우 회색 처리 + "휴장" 라벨

---

## 8. 데이터 신선도 표시

각 카드 우상단에 마지막 갱신 시각을 작은 글씨로 표기 (`text-xs text-gray-500`).

| 상태 | 표시 | 시각화 |
|------|------|------|
| Fresh (갱신 주기 내) | "14:32 KST" | 정상 색상 |
| Stale (갱신 주기 초과) | "stale · 3h ago" | 회색 처리 + 카드 우상단 `—` 배지 |
| No data (API 실패) | "—" | 값 영역 `—`로 표시, 회색 처리, hover 시 에러 이유 |

갱신 주기 (Phase 2 매핑 인계):
- 일별 지표: 1일 초과 시 stale
- 월별 지표 (CPI/PPI/수출): 발표 예정일 +3일 초과 시 stale
- 주별 지표 (KOSPI Fwd EPS): 7일 초과 시 stale

---

## 9. 인터랙션 패턴

- **카드 클릭**: L4 개별 지표 상세 페이지로 이동 (`/indicator/vix`, `/indicator/core-cpi`, ...)
- **카드 hover**: 임계치 룰 tooltip 표시 ("VIX > 30 → warning, > 40 → critical")
- **알림 항목 클릭**: 관련 지표 카드 하이라이트 (1.5초 펄스) + 해당 L4 페이지로 이동
- **레짐 배지 클릭**: 레짐 진입 히스토리 모달 (지난 1년 timeline + 각 레짐 구간의 자산 배분 시사 회상)
- **발표 일정 항목 클릭**: 관련 지표 카드로 스크롤 + 하이라이트 (예: "US Core CPI" 클릭 → Core CPI 카드)
- **헤더 알림 벨(🔔3) 클릭**: 알림 피드 토글 (모바일/태블릿) 또는 스크롤 (데스크탑)
- **키보드**: Tab으로 카드 순회, Enter로 상세 진입, Esc로 모달 닫기

---

## 10. 반응형 명세

| 브레이크포인트 | 그리드 | 카드 배치 | 알림 피드 | 레짐 배지 | 발표 일정 |
|-------------|------|---------|---------|---------|---------|
| **≥1280** (desktop) | 12 columns | 메인 4×2 + 보조 4×N | 우측 사이드바 고정 (320px) | 헤더 inline | 우측 사이드바 하단 |
| **768~1279** (tablet) | 8 columns | 메인 2×4 | 메인 하단 섹션 (접힘/펼침) | 헤더 inline | 메인 하단 |
| **<768** (mobile) | 1 column | 카드 1×N 스택 | 별도 탭 (bottom nav) | sticky top (배너 아래) | 별도 탭 |

공통:
- 알림 배너는 모든 화면에서 sticky top
- 레짐 배지는 모바일에서 sticky top (배너 다음)
- 카드 패딩: 데스크탑 `p-4`, 태블릿 `p-3`, 모바일 `p-3`
- 카드 폰트 크기: 데스크탑 `text-3xl`, 모바일 `text-2xl` (큰 숫자)

---

## 11. 접근성

- **색맹 대응**: 색상 + 아이콘(Lucide) + 텍스트 라벨 3중 인코딩. severity가 색상으로만 구분되는 영역 없음.
- **다크 모드**: 자동 감지(`prefers-color-scheme`) + 수동 토글. 모든 색상 토큰 라이트/다크 페어 정의.
- **키보드 네비게이션**: 모든 인터랙티브 요소 Tab으로 접근. focus ring `ring-2 ring-blue-500`.
- **스크린 리더**: severity 배지에 `aria-label` 명시 ("위험: VIX 패닉 룰 발화")
- **명도 대비**: 본문 텍스트와 배경 WCAG AA 이상 (4.5:1). 큰 숫자는 AAA(7:1) 권장.
- **모션 감소**: `prefers-reduced-motion: reduce` 미디어 쿼리 시 펄스 애니메이션 정적 보더로 대체.

---

## 12. 기술 아키텍트 인계사항 (Phase 5 → 구현)

### 12.1 색상 토큰 export

`tailwind.config.ts`에 severity 및 레짐 색상을 커스텀 토큰으로 정의:

```typescript
theme: {
  extend: {
    colors: {
      severity: {
        normal: '#10b981',
        info: '#6b7280',
        warning: '#f59e0b',
        'critical-sell': '#ef4444',   // 매도형
        'critical-buy': '#a855f7',    // 매수형
        stale: '#9ca3af',
      },
      regime: {
        goldilocks: { light: '#d1fae5', dark: '#065f46' },
        riskOn: { light: '#dcfce7', dark: '#166534' },
        riskOff: { light: '#fef3c7', dark: '#92400e' },
        stagflation: { light: '#ffedd5', dark: '#9a3412' },
        recession: { light: '#fee2e2', dark: '#991b1b' },
      },
    },
  },
}
```

`src/lib/signals/styling.ts`에 severity → 색상/아이콘 매핑 함수 export (Phase 3 인계).

### 12.2 위젯 컴포넌트 TypeScript 인터페이스

```typescript
type Severity = 'normal' | 'info' | 'warning' | 'critical-sell' | 'critical-buy' | 'stale' | 'conflict'

interface IndicatorCardProps {
  id: string
  title: string
  value: number
  prevValue?: number
  unit?: string
  sparklineData: { date: string; value: number }[]
  thresholds: { warn: number; alert: number; direction: 'above' | 'below' }
  severity: Severity
  lastUpdatedAt: string  // ISO
  releaseScheduleHint?: string  // "월 발표, D-2"
  onClick?: () => void
}

interface AlertBannerProps {
  alerts: CriticalAlert[]
  dismissedRuleIds: string[]
  onDismiss: (ruleId: string) => void
  onDetail: (ruleId: string) => void
}

interface RegimeBadgeProps {
  current: 'Goldilocks' | 'Risk-On' | 'Risk-Off' | 'Stagflation' | 'Recession'
  enteredAt: string
  previous?: string
  onClick?: () => void
}
```

모든 컴포넌트는 **불변성 원칙** 준수 — props 변경 없이 신규 객체 생성.

### 12.3 펄스 애니메이션

CSS keyframes로 처리, JS 부담 최소화. `framer-motion` 사용 금지 (번들 크기). Tailwind 커스텀 애니메이션으로 등록:

```typescript
keyframes: {
  'pulse-severity': {
    '0%':   { boxShadow: '0 0 0 0 var(--severity-color)' },
    '70%':  { boxShadow: '0 0 0 8px transparent' },
    '100%': { boxShadow: '0 0 0 0 transparent' },
  },
},
animation: {
  'pulse-severity': 'pulse-severity 1.5s ease-out 1',
}
```

펄스 트리거는 React `useEffect`에서 severity 변경 감지 시 1회 클래스 토글.

### 12.4 데이터 polling

- **알림 피드 polling**: 5분 주기 (실시간 불필요, 중기 사용자)
- **카드 데이터 fetch**: 페이지 로드 + 30분 주기 백그라운드 갱신
- **시그널 엔진 cron**: 일 1회 KST 09:00 (Phase 3 인계). 한국 수출 발표 후 +30분 재평가.
- **stale 판정**: client-side에서 `lastUpdatedAt`과 갱신 주기 비교, server fetch 없이도 stale 배지 표시

### 12.5 라우팅 구조

```
/                          → 메인 대시보드
/indicator/[id]            → L4 개별 지표 상세 (vix, core-cpi, t10y2y, ...)
/alerts                    → 알림 피드 전체 (모바일 탭)
/schedule                  → 발표 일정 전체
/regime                    → 레짐 진입 히스토리
/settings                  → 카드 표시/숨김, 다크모드, dismiss 초기화
```

### 12.6 상태 관리

- 단순 SWR 또는 React Query로 충분 (개인 사용, 다중 사용자 없음)
- LocalStorage: `dismissedRuleIds`, `theme`, `cardVisibility`
- SQLite (서버): `signal_state`, `alert_history`, 지표 시계열 (Phase 3 인계)

---

## 13. 검증 체크리스트

UX 설계가 사용자 brief의 요구를 충족하는지 self-check:

- [x] **한눈에 80%**: 데스크탑 fold 위에 레짐 + 8개 카드 + 활성 critical 알림 모두 노출
- [x] **임계치 알림**: AlertBanner + 카드 펄스 + 알림 피드 3중 표시
- [x] **인앱만**: 푸시/이메일 UI 일절 없음, 모든 알림은 화면 내
- [x] **한국 투자자 시간대**: 모든 시각 KST 기본, ET 병기 (특히 발표 일정)
- [x] **매수/매도 색상 분리**: 매도 critical = red, 매수 critical = purple. CONFLICT 시 양쪽 병기
- [x] **레짐 5개 색상 분리**: emerald/green/amber/orange/red 5단계 명확 구분
- [x] **3개 자산군 의식**: 한국(KR 수출, USD/KRW) + 미국(VIX, CPI, 금리) + 글로벌(DXY, HY OAS) 모두 메인 카드
- [x] **중기 시간축**: 카드 스파크라인 30~90일, 알림 cooldown 7~30일 (Phase 3 인계 반영)
- [x] **개인 사용**: 인증 UI 없음, 다중 사용자 고려 없음
- [x] **노이즈 억제**: threshold crossing 펄스만, 머무는 동안 정적. 카테고리 그룹화로 중복 숨김.
- [x] **자동 결론 금지**: CONFLICT 시 양쪽 병기, 시스템이 매수/매도 결정 안 함
- [x] **색맹 대비**: 색상 + 아이콘 + 텍스트 3중 인코딩, 모션 감소 옵션 지원
- [x] **반응형**: desktop/tablet/mobile 모두 명시, 모바일에서 레짐 sticky

---

## 14. 다음 단계 (Phase 5 인계)

### 14.1 기술 아키텍트(Phase 5)에 전달

- [ ] 본 문서의 12.1~12.6 (색상 토큰, 컴포넌트 인터페이스, 애니메이션, polling, 라우팅, 상태 관리)
- [ ] 위젯 10종을 `src/components/widgets/`에 1파일 1컴포넌트 원칙으로 배치 (불변성, 200~400줄)
- [ ] severity 색상 매핑은 `src/lib/signals/styling.ts` (Phase 3 인계 함수 시그니처 준수)
- [ ] AlertFeed의 dismiss 상태는 LocalStorage + SQLite `alert_dismissed` 테이블 동기화
- [ ] 펄스 애니메이션은 CSS-only (framer-motion 사용 금지)

### 14.2 사용자 검토 권장 사항

1. **메인 카드 8개 선택**: 본 설계는 Phase 1 권고를 그대로 채택. 사용자가 PPI/WTI를 메인으로 올리고 싶으면 보조 카드와 swap 가능 — 설정 UI에서 토글.
2. **알림 배너 위치**: 헤더 위 sticky로 설계했으나, 화면 영역 손실이 부담스러우면 헤더 내 배지 형태로 축소 가능.
3. **CONFLICT 처리**: 본 설계는 양쪽 병기 + 시스템 결론 회피. 사용자가 "패닉 바닥권 매수 우세" 같은 자동 해석을 원하면 추가 옵션화 검토.
4. **모바일 카드 1열 vs 2열**: <768에서 1열로 설계했으나 카드 높이가 짧으면 2열도 가능. 첫 사용 후 피드백 권장.

### 14.3 추가 위젯 검토 (Phase 6+ 후보)

- 백테스트 결과 시각화 (룰별 적중률/위양성률)
- 자산 배분 시뮬레이터 (레짐 변경 시 권장 비중)
- 외국인 누적 순매수 차트 (KR 매크로 보조)
- 뉴스 패널 (북한 리스크 등 정성 이벤트 — Phase 1 권고)

---

본 문서는 Phase 5(기술 아키텍처)의 컴포넌트 구현 명세에 직접 입력된다. 모든 위젯·색상·인터랙션은 본 문서를 단일 출처(single source of truth)로 한다.
