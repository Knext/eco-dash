---
name: investment-dashboard-design
description: "거시지표 기반 투자 대시보드 설계 오케스트레이터. 5인 에이전트 팀(지표 분석가·데이터 매퍼·시그널 디자이너·UX 디자이너·기술 아키텍트)으로 지표 선정부터 구현 계획까지 산출. 트리거: 투자 대시보드, 매크로 대시보드, 경제지표 대시보드 설계."
---

# Investment Dashboard Design — 오케스트레이터

## 목적

거시경제 지표 기반 투자 판단 대시보드의 **전체 설계 문서**를 5인 에이전트 팀으로 산출한다. 결과물은 곧바로 구현에 들어갈 수 있는 수준의 청사진이다.

## 실행 모드

**에이전트 팀 모드** — `TeamCreate`로 팀을 구성하고, `TaskCreate`로 단계별 작업을 할당. 팀원들은 `SendMessage`로 직접 조율하며 산출물은 `_workspace/` 디렉토리에 파일로 공유.

## 팀 구성 (5명)

| 에이전트 | 역할 |
|---------|------|
| `macro-indicator-analyst` | 지표 선정·임계치·해석 |
| `data-source-mapper` | API 소스 매핑·인증·비용 |
| `signal-rule-designer` | 매수/매도 시그널 룰·레짐 분류 |
| `dashboard-ux-designer` | 레이아웃·위젯·색상·반응형 |
| `dashboard-tech-architect` | 스택 선정·디렉토리 구조·파이프라인 |

## 워크플로우 (Phase 파이프라인)

### Phase 0: 사전 준비
- 사용자에게 다음 4가지 확인:
  1. 투자 시간축 (단기 며칠~몇 주 / 중기 몇 달 / 장기 1년 이상)
  2. 주요 자산군 (한국 주식 중심 / 미국 주식 / 글로벌 / ETF)
  3. 알림 채널 선호 (인앱만 / Slack / 이메일 / 푸시)
  4. 운영 형태 (혼자 사용 / 팀 공유 / 공개)
- 응답을 `_workspace/00_brief.md`에 기록

### Phase 1: 지표 카탈로그 (병렬 가능)
- **담당**: `macro-indicator-analyst`
- **참고 스킬**: `macro-indicator-catalog`
- **출력**: `_workspace/01_analyst_indicators.md`
- 사용자가 명시한 지표 + 권장 추가 지표 (VIX, MOVE, CPI/Core CPI, PPI, 미국채 3M/2Y/10Y/30Y, T10Y2Y/T10Y3M 스프레드, Fed Funds, HY 스프레드, DXY, WTI, 구리/금, 한국 수출입, 무역수지, KOSPI EPS)

### Phase 2: 데이터 소스 매핑 (Phase 1과 병렬)
- **담당**: `data-source-mapper`
- **참고 스킬**: `financial-data-sources`
- **출력**: `_workspace/02_datasource_mapping.md`
- analyst가 카탈로그 초안을 내면 즉시 매핑 시작. 불가능한 지표는 analyst에게 대체 요청.

### Phase 3: 시그널 룰 설계 (Phase 1, 2 완료 후)
- **담당**: `signal-rule-designer`
- **참고 스킬**: `investment-signal-design`
- **출력**: `_workspace/03_signal_rules.json` + `_workspace/03_signal_rules.md`
- analyst의 임계치 기반으로 단일/복합 룰 작성. 레짐 분류 모델 포함.

### Phase 4: UX 설계 (Phase 1, 3 완료 후)
- **담당**: `dashboard-ux-designer`
- **참고 스킬**: `dashboard-ux-patterns`
- **출력**: `_workspace/04_ux_design.md`
- 메인 뷰 6~8개 지표는 analyst와 협의해서 선정. severity → 색상/배지 매핑은 signal-designer와 협의.

### Phase 5: 기술 아키텍처 (Phase 2, 3, 4 완료 후)
- **담당**: `dashboard-tech-architect`
- **참고 스킬**: `dashboard-tech-stack`
- **출력**: `_workspace/05_tech_architecture.md`
- 데이터 소스의 갱신 주기/rate limit, 시그널 평가 엔진의 인터페이스, UX의 컴포넌트 구조를 모두 반영.

### Phase 6: 통합 설계 보고서
- **담당**: 오케스트레이터(메인) — 직접 작성
- **출력**: `INVESTMENT_DASHBOARD_DESIGN.md` (사용자 디렉토리 루트)
- 모든 `_workspace/*.md` 산출물을 종합한 단일 문서

## 데이터 전달 프로토콜

- **파일 기반 (주력)**: 모든 산출물은 `_workspace/{NN}_{agent}_{artifact}.{ext}` 형식으로 저장
- **메시지 기반**: 팀원 간 질의/검증은 `SendMessage`
- **태스크 기반**: `TaskCreate`로 Phase 의존성 표현 (Phase 3은 Phase 1, 2 완료 의존)

작업 디렉토리 구조:
```
economyDashboard/
├── _workspace/                          # 중간 산출물 (보존)
│   ├── 00_brief.md
│   ├── 01_analyst_indicators.md
│   ├── 02_datasource_mapping.md
│   ├── 03_signal_rules.json
│   ├── 03_signal_rules.md
│   ├── 04_ux_design.md
│   └── 05_tech_architecture.md
└── INVESTMENT_DASHBOARD_DESIGN.md       # 최종 통합 보고서
```

## 통합 보고서 구조 (`INVESTMENT_DASHBOARD_DESIGN.md`)

```markdown
# 거시지표 기반 투자 대시보드 — 설계 문서

## 0. Executive Summary
- 목적, 사용자, 핵심 가치 (3~5문장)
- 권장 스택 한 줄

## 1. 모니터링 지표 (카탈로그)
- 카테고리별 표 + 핵심 조합 시그널
- 한국 투자자 관점 주의사항

## 2. 데이터 소스 매핑
- 지표 ↔ 소스 매핑 표
- API 키 발급 가이드

## 3. 매수/매도 시그널 룰
- 단일 임계치 알림 / 복합 시그널 / 레짐 분류
- severity 정책 + cooldown

## 4. 대시보드 UX 설계
- 와이어프레임
- 위젯 카탈로그 + 색상 토큰
- 반응형 명세

## 5. 기술 아키텍처
- 스택 선정 + 근거
- 디렉토리 구조
- 데이터 파이프라인
- 환경변수 + 비용

## 6. 구현 로드맵
- 4주 단위 마일스톤

## 7. 리스크와 한계
- 데이터 소스 의존성 / 시그널 false positive / 운영 비용
```

## 에러 핸들링

| 에러 유형 | 대응 |
|---------|------|
| 에이전트 1명 실패 | 1회 재시도 → 실패 시 해당 산출물 누락 명시 후 진행 |
| 지표-소스 불일치 | analyst와 data-mapper 재협의, 대체 지표 또는 유료 옵션 명시 |
| 시그널 룰 충돌 | 우선순위 규칙(severity → 시간순) 적용, 보고서에 충돌 기록 |
| 사용자 응답 없음(Phase 0) | 기본값 사용: 중기 + 한국+미국 주식 + 인앱 알림 + 혼자 사용 |

## 팀 크기 가이드

5명 팀, Phase 6개 = 팀원당 1~2 Phase. 조율 오버헤드 적정.

## 테스트 시나리오

### 정상 시나리오
사용자가 "VIX/CPI/PPI/한국 수출입/미국채 3,10,30년물" 명시 → 
Phase 0 brief 수집 →
Phase 1, 2 병렬 → Phase 3 → Phase 4 → Phase 5 → Phase 6
산출물 7개 파일 + 최종 보고서 1개

### 에러 시나리오
data-source-mapper가 KOSPI EPS의 무료 소스 없음 보고 →
analyst에게 메시지 → analyst가 "한국 수출 YoY를 EPS 프록시로" 대체 제안 →
보고서에 한계와 대체안 명시

## 후속 작업 옵션

설계 완료 후 사용자에게 다음 옵션 제시:
1. **PoC 구현 시작**: Streamlit으로 7일 내 동작 버전
2. **풀스택 구현 시작**: Next.js로 4주 로드맵 시작
3. **설계 추가 라운드**: 특정 부분 심화 (예: 백테스트 모듈 설계 추가)
