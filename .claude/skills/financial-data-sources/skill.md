---
name: financial-data-sources
description: "거시·금융 데이터 API 소스 카탈로그. FRED, ECOS, KITA, Yahoo Finance, Alpha Vantage 등의 엔드포인트·인증·무료 한도 정보. 트리거: 데이터 소스, API, 데이터 수집."
---

# Financial Data Sources — 데이터 소스 카탈로그

## 워크플로우

지표 카탈로그를 받아 각 지표별로 다음 표를 채운다:

| 지표 ID | 1차 소스 | 시리즈 ID / 엔드포인트 | 인증 | 비용 | 갱신 주기 | 폴백 소스 |

## 도구 사용법

웹 조사 필요 시 WebSearch, WebFetch 사용 (API 문서 확인).

## 출력 규칙

- `_workspace/02_datasource_mapping.md`에 저장
- API 키 발급 가이드 별도 섹션
- 무료/유료 명확히 구분
- 비공식 API(yfinance 등) 안정성 경고 표시

## 주요 데이터 소스 정리

### FRED (Federal Reserve Economic Data) — 최우선 1차 소스
- **URL**: https://fred.stlouisfed.org/
- **API**: https://api.stlouisfed.org/fred/series/observations?series_id={ID}&api_key={KEY}&file_type=json
- **인증**: 무료 API key (https://fred.stlouisfed.org/docs/api/api_key.html)
- **비용**: 완전 무료
- **레이트 리미트**: 120 req/min
- **커버리지**: 미국 매크로 거의 모든 시리즈
- **주요 시리즈 ID**:
  - `VIXCLS` (VIX 종가)
  - `CPIAUCSL` (CPI), `CPILFESL` (Core CPI)
  - `PPIACO` (PPI)
  - `DGS3MO`, `DGS2`, `DGS10`, `DGS30` (미국채 금리)
  - `T10Y2Y`, `T10Y3M` (스프레드)
  - `BAMLH0A0HYM2` (HY 스프레드)
  - `DFF` (Fed Funds Rate)
  - `DTWEXBGS` (Trade Weighted Dollar)
  - `DCOILWTICO` (WTI)
  - `T10YIE` (10Y BEI)

### ECOS (한국은행 경제통계시스템) — 한국 매크로 1차 소스
- **URL**: https://ecos.bok.or.kr/
- **API**: https://ecos.bok.or.kr/api/StatisticSearch/{KEY}/json/kr/1/100/{STAT_CODE}/{CYCLE}/{START}/{END}
- **인증**: 무료 API key
- **커버리지**: 한국 기준금리, 통화량, 환율, 국내 산업동향 등
- **갱신**: 발표 후 수일~수주

### KITA (한국무역협회) / 산업통상자원부
- **URL**: https://stat.kita.net/ 또는 https://www.motie.go.kr/
- **API**: 일부 무료 API 제공 (KITA: https://tradedata.go.kr/cts/index.do)
- **대안**: 매월 1일 산자부 발표를 RSS/스크래핑

### Yahoo Finance (yfinance 라이브러리)
- **사용법**: Python `yfinance` 또는 직접 API 호출
- **인증**: 불필요
- **비용**: 무료 (비공식, 이용약관 회색지대)
- **커버리지**: 주가, 지수, 환율, 일부 채권 ETF
- **주의**: 비공식 API, 갑작스러운 변경 가능성. 프로덕션은 폴백 권장.
- **티커 예**: `^VIX`, `^GSPC`, `^KS11` (KOSPI), `KRW=X` (USD/KRW), `CL=F` (WTI 선물)

### Alpha Vantage
- **URL**: https://www.alphavantage.co/
- **인증**: 무료 API key (무료 500 req/day, 5 req/min)
- **커버리지**: 주가, 외환, 일부 매크로
- **장점**: 공식 API, JSON 응답

### Stooq
- **URL**: https://stooq.com/q/d/?s={SYMBOL}&i=d
- **비용**: 무료, 인증 불필요
- **형식**: CSV 다운로드
- **커버리지**: 글로벌 지수, 원자재, 환율
- **주의**: 비공식 사용

### Trading Economics
- **URL**: https://tradingeconomics.com/
- **API**: 유료 (월 $79~)
- **커버리지**: 전 세계 매크로 거의 모든 것
- **대안 용도**: 유료 가능 시 1차, 그 외엔 스크래핑 시 이용약관 확인

### KRX (한국거래소)
- **API**: 일부 공개 (https://data.krx.co.kr/)
- **커버리지**: 주가, 지수, 공시

## API 키 발급 가이드

1. **FRED**: https://fred.stlouisfed.org/docs/api/api_key.html — 이메일 등록만으로 즉시 발급
2. **ECOS**: https://ecos.bok.or.kr/api/ — 신청 후 즉시 발급
3. **Alpha Vantage**: https://www.alphavantage.co/support/#api-key — 즉시 발급

## 환경변수 표준

```bash
FRED_API_KEY=...
ECOS_API_KEY=...
ALPHA_VANTAGE_KEY=...
```

## 수집 아키텍처 권장

- **일별 데이터 (CPI/PPI/금리/한국수출)**: 1일 1회 cron (예: 매일 09:00 KST)
- **시장 데이터 (VIX/환율/지수)**: 15분~1시간 polling (장중)
- **캐시**: 응답을 SQLite/DB에 저장하여 rate limit 회피 + 히스토리 확보
- **재시도**: 지수 백오프 (1s, 2s, 4s, ...)
