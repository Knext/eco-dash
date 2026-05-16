---
name: investment-signal-design
description: "거시지표 기반 매수/매도 시그널 룰 설계 방법론. 단일/복합 시그널, severity, regime 분류, false positive 관리. 트리거: 시그널 룰, 알림 임계치, 매매 신호 설계."
---

# Investment Signal Design — 시그널 룰 설계 방법

## 워크플로우

### 1. 시그널 분류
- **단일 임계치 시그널**: 1개 지표 + 1개 임계치 (예: VIX > 30)
- **복합 시그널**: AND/OR로 2개 이상 결합
- **레짐 분류 시그널**: 다지표 가중 점수 → 거시 상태 (risk-on / risk-off / 침체 등)

### 2. Severity 3단계
- `info` — 정보 제공 (예: CPI 발표 임박)
- `warning` — 포지션 점검 권고
- `critical` — 즉각 행동 검토

### 3. 룰 명세 형식 (JSON Schema)
```json
{
  "id": "STRING_ID",
  "name": "사람 친화적 이름",
  "severity": "info|warning|critical",
  "indicators": ["DGS10", "DGS2"],
  "condition": "지표 ID 기반 표현식 (Python/JS 호환)",
  "cooldown_hours": 168,
  "rationale": "왜 이 룰이 의미 있는가",
  "false_positive_note": "역사적으로 헛발이 친 케이스",
  "action_hint": "이 시그널이 뜨면 무엇을 검토할지"
}
```

### 4. 룰 검증 체크리스트
- [ ] 임계치가 라운드 넘버가 아니라 데이터 근거 있는가
- [ ] 백테스트 가능한가 (역사적 트리거 횟수와 후속 결과)
- [ ] 같은 시그널이 노이즈로 반복되지 않도록 cooldown 있는가
- [ ] severity 일관성: critical은 정말 즉각 행동급인가
- [ ] 반대 시그널과 충돌하지 않는가 (매수+매도 동시 트리거 방지)

## 시그널 우선순위 규칙

같은 시간대에 여러 시그널 트리거 시:
1. severity 높은 것 우선 (critical > warning > info)
2. 같은 severity면 최근 트리거 우선
3. 같은 카테고리(예: 침체) 시그널 묶음으로 표시

## 거시 레짐 분류 모델

5가지 레짐 + 가중치 점수:

| 레짐 | 트리거 조건 | 자산 시사 |
|------|-----------|----------|
| Goldilocks | 성장↑ + 인플레↓ + VIX 낮음 | 주식 비중 확대, 성장주 |
| Risk-On | VIX < 20 + HY 스프레드 안정 | 주식·신흥국 |
| Risk-Off | VIX > 25 OR HY 스프레드 > 500 | 채권·금·달러 비중↑ |
| Stagflation | Core CPI > 4% + GDP 둔화 | 원자재·금·필수소비재 |
| Recession | 10Y-2Y 역전 + 실업↑ + 신용 스트레스 | 장기채·현금 |

## 알림 노이즈 억제

- **Cooldown**: 동일 룰은 N시간 내 재발송 금지 (기본 168시간 = 1주일)
- **Threshold crossing only**: 임계치 단순 "넘은 순간"만 알림, 머무는 동안은 미발송
- **Daily digest 옵션**: critical 외 알림은 하루 1회 요약

## 출력 규칙

- `_workspace/03_signal_rules.json` (구조화)
- `_workspace/03_signal_rules.md` (사람 친화적 설명)
- 각 룰마다 rationale + false_positive_note 필수
