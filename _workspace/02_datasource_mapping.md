# 데이터 소스 매핑 (Phase 2)

작성일: 2026-05-16
담당: data-source-mapper
대상 지표 카탈로그: `_workspace/01_indicator_catalog.md` (Phase 1) 및 사용자 Brief

## 0. 요약

- **총 지표 18개** 매핑 (사용자 명시 5개 + 추가 후보 13개).
- **무료 소스 커버리지: 17/18 (약 94%)**. KOSPI EPS만 무료 정공법이 없어 프록시 또는 수동 입력 권장.
- **권장 소스 조합**: `FRED + ECOS + KITA(or 산업부 RSS) + Yahoo Finance + Stooq`.
- **총 운영 비용**: 0원 (모든 1차 소스가 무료 API). 단, yfinance/Stooq는 비공식이라 폴백 필수.
- **인증 필요 키 2종**: FRED, ECOS. 둘 다 이메일 등록만으로 즉시 발급.
- **수집 패턴**: 일별 cron 1회 (KST 09:00) + 시장 데이터 15~60분 polling.

권장 소스 조합 한 줄 요약:
```
미국 매크로/금리/스프레드/원자재  →  FRED (1차)
한국 매크로/환율/금리             →  ECOS (1차)
한국 수출입/무역수지              →  KITA/산업부 (1차) + ECOS (폴백)
지수/ETF/티커 OHLCV              →  Yahoo Finance (1차, 비공식) + Stooq (폴백)
KOSPI EPS                       →  무료 정공 없음 → 수출 YoY 프록시 또는 수동
```

---

## 1. 지표별 소스 매핑

| # | 지표 ID | 한국어명 | 1차 소스 | 시리즈ID / 엔드포인트 | 인증 | 비용 | 갱신 주기 | 지연(latency) | 폴백 소스 | 비고 |
|---|---------|---------|---------|---------------------|------|------|----------|--------------|----------|------|
| 1 | VIX | VIX 지수 | FRED | `VIXCLS` | API key | 무료 | 일별 (영업일) | T+1 | Yahoo `^VIX` / Stooq `^vix` | 장중 실시간은 yfinance |
| 2 | CPI | 미국 소비자물가지수 | FRED | `CPIAUCSL` (SA, 1982-84=100) | API key | 무료 | 월별 | 발표 ~2주 | BLS 직접 | YoY 계산은 클라이언트에서 |
| 3 | CORE_CPI | 미국 근원 CPI | FRED | `CPILFESL` | API key | 무료 | 월별 | 발표 ~2주 | BLS | Food/Energy 제외 |
| 4 | PPI | 미국 생산자물가지수 | FRED | `PPIACO` (All Commodities) 또는 `PPIFIS` (Final Demand) | API key | 무료 | 월별 | 발표 ~2주 | BLS | `PPIFIS`가 헤드라인 PPI에 더 가까움 |
| 5 | DGS3 | 미국채 3년물 금리 | FRED | `DGS3` | API key | 무료 | 일별 | T+1 | Treasury.gov XML | 사용자 요구 명시 |
| 6 | DGS10 | 미국채 10년물 금리 | FRED | `DGS10` | API key | 무료 | 일별 | T+1 | Treasury.gov | |
| 7 | DGS30 | 미국채 30년물 금리 | FRED | `DGS30` | API key | 무료 | 일별 | T+1 | Treasury.gov | |
| 8 | T10Y2Y | 10Y-2Y 스프레드 | FRED | `T10Y2Y` | API key | 무료 | 일별 | T+1 | DGS10-DGS2 자체계산 | 침체 시그널 핵심 |
| 9 | T10Y3M | 10Y-3M 스프레드 | FRED | `T10Y3M` | API key | 무료 | 일별 | T+1 | DGS10-DGS3MO 자체계산 | NY Fed가 침체확률 모델에 사용 |
| 10 | DFF | Fed Funds Rate | FRED | `DFF` (effective) 또는 `FEDFUNDS` (월평균) | API key | 무료 | 일별 / 월별 | T+1 | Fed H.15 | `DFEDTARU`/`DFEDTARL`는 상하단 |
| 11 | HY_OAS | 미국 HY 스프레드 | FRED | `BAMLH0A0HYM2` (ICE BofA US HY OAS) | API key | 무료 | 일별 | T+1 | ICE | 신용 risk-on/off 핵심 |
| 12 | DXY | 달러 인덱스 | FRED | `DTWEXBGS` (광의 무역가중) | API key | 무료 | 일별 | T+1 | Stooq `dx.f` / yfinance `DX-Y.NYB` | ICE DXY (USDX)는 yfinance 권장 |
| 13 | WTI | WTI 원유 | FRED | `DCOILWTICO` | API key | 무료 | 일별 | T+1 | yfinance `CL=F` (선물) / Stooq | 현물 가격 |
| 14 | CU_AU | 구리/금 비율 | 계산 (FRED) | `PCOPPUSDM` (구리, 월) ÷ `GOLDAMGBD228NLBM` (금, 일) | API key | 무료 | 월/일 | T+1~ | yfinance `HG=F`÷`GC=F` (일별) | 일별 신선도 원하면 yfinance 권장 |
| 15 | MOVE | MOVE Index (채권 변동성) | yfinance | `^MOVE` | 없음 | 무료 | 일별 | T+1 | Stooq (제한적) / 수동 | **FRED 미수록**, 비공식 API |
| 16 | BEI10 | 10Y BEI (기대인플레) | FRED | `T10YIE` | API key | 무료 | 일별 | T+1 | DGS10-DFII10 자체계산 | TIPS 시장 |
| 17 | KR_EXP | 한국 수출 (월) | KITA / 산업부 | KITA `tradedata.go.kr` 또는 산자부 발표문 | 일부 무료 | 무료 | 월별 | 발표 D+1 | ECOS `901Y014` 계열 | 매월 1일 산자부 발표가 가장 빠름 |
| 18 | KR_IMP | 한국 수입 (월) | KITA / 산업부 | 동일 | 일부 무료 | 무료 | 월별 | 발표 D+1 | ECOS | |
| 19 | KR_TB | 한국 무역수지 | KITA / 산업부 | 수출-수입 계산 또는 ECOS `301Y013` 계열 (확인 필요) | 일부 무료 | 무료 | 월별 | 발표 D+1 | ECOS | 통관 기준 vs 국제수지 기준 구분 필요 |
| 20 | USDKRW | 원/달러 환율 | ECOS | ECOS `731Y001` 계열 (확인 필요) | API key | 무료 | 일별 | T+1 | yfinance `KRW=X` / Stooq `usdkrw` | 일중 실시간은 yfinance 권장 |
| 21 | KOSPI | KOSPI 지수 | yfinance | `^KS11` | 없음 | 무료 | 일별/15분 | T+1 또는 15~20분 지연 | Stooq `^kospi` / KRX | 장중 데이터는 비공식 |
| 22 | KOSPI_EPS | KOSPI EPS (12M Fwd) | **무료 정공 없음** | — | — | — | 월별 추정치 | — | 프록시: 한국 수출 YoY (`KR_EXP`) / 수동 입력 | **사용자에게 경고 필요** |
| 23 | SP500 | S&P 500 | yfinance | `^GSPC` | 없음 | 무료 | 일별 | T+1 | Stooq `^spx` / FRED `SP500` (일별, 10년 한정) | 메인 자산 |
| 24 | GOLD | 금 시세 | FRED | `GOLDAMGBD228NLBM` (LBMA AM) | API key | 무료 | 일별 | T+1 | yfinance `GC=F` | 일중은 yfinance |

> 사용자 명시 5개 (VIX, CPI, PPI, 한국 수출입, 미국채 3/10/30년) + 추가 후보 13개 + 자산 지수 4개 = 24행. 수출/수입/무역수지를 분리하여 N=24까지 확장.

---

## 2. 카테고리별 소스 정리

### 2.1 미국 매크로 (FRED 1차)

FRED는 본 프로젝트의 백본이다. 단일 API 키로 18개 지표 중 14개를 커버.

**호출 예시** (모든 시리즈 공통 패턴):
```bash
GET https://api.stlouisfed.org/fred/series/observations
    ?series_id=DGS10
    &api_key=${FRED_API_KEY}
    &file_type=json
    &observation_start=2020-01-01
    &frequency=d           # 또는 m (월), w (주)
    &units=lin             # lin=원본, pc1=YoY%, chg=차분, log=로그
```

**권장 FRED 시리즈 ID 목록**:

| 카테고리 | 시리즈 ID | 의미 |
|---------|----------|------|
| 변동성 | `VIXCLS` | VIX 종가 |
| 물가 | `CPIAUCSL`, `CPILFESL`, `PPIACO`, `PPIFIS`, `T10YIE` | CPI, Core CPI, PPI 2종, 10Y BEI |
| 금리 | `DGS3MO`, `DGS2`, `DGS3`, `DGS10`, `DGS30`, `DFF`, `FEDFUNDS`, `DFEDTARU` | 미국채 + Fed Funds |
| 스프레드 | `T10Y2Y`, `T10Y3M`, `BAMLH0A0HYM2` | 텀 스프레드 + HY OAS |
| 통화/원자재 | `DTWEXBGS`, `DCOILWTICO`, `GOLDAMGBD228NLBM`, `PCOPPUSDM` | DXY(광의), WTI, 금, 구리 |

**유용한 추가 옵션**:
- `units=pc1` 로 YoY% 변환을 서버 측에서 처리 (CPI YoY 등 계산 생략 가능).
- `aggregation_method=avg` 로 일→월 집계 가능.
- 한 번에 한 시리즈만 요청 가능 → 클라이언트에서 병렬 호출. 120 req/min 한도이므로 일반 사용에서 여유.

### 2.2 한국 매크로 (ECOS + KITA)

#### ECOS (한국은행 경제통계시스템)

**엔드포인트 패턴**:
```
GET https://ecos.bok.or.kr/api/StatisticSearch/{KEY}/json/kr/1/100/{STAT_CODE}/{CYCLE}/{START}/{END}/{ITEM_CODE1}
```
- `{CYCLE}`: `D`(일), `M`(월), `Q`(분기), `A`(연)
- `{START}/{END}`: 일별이면 `YYYYMMDD`, 월별이면 `YYYYMM`

**자주 쓰는 통계표 코드** (정확한 ITEM CODE는 ECOS 통계표 상세 페이지에서 직접 확인 필수):
- `722Y001` — 한국은행 기준금리 (대표 사례, 안정적)
- `731Y001` — 시장환율 (USD/KRW 등). ITEM 코드로 통화 선택.
- `901Y014` 계열 — 수출입 통계 (통관 기준). KITA가 더 적시성 높음.
- `301Y013` 계열 — 국제수지 (BOP, 분기/월).

> **주의**: ECOS 통계표 코드는 시간에 따라 개편될 수 있다. 구현 단계에서 ECOS 웹사이트 "통계검색 → 상세보기"에서 코드를 최종 확인할 것. 본 문서의 코드는 출발점일 뿐.

**무료 한도**: 1일 10,000 요청. 개인 대시보드에는 차고 넘침.

#### KITA / 산업통상자원부 (수출입)

수출입은 두 가지 발표 채널이 있다:

1. **산업통상자원부 (매월 1일 발표)** — 가장 빠름. 전월 수출입 잠정치를 익월 1일 발표.
   - URL: https://www.motie.go.kr/ → 보도자료
   - **무료 옵션**: RSS 또는 보도자료 페이지 스크래핑 (PDF/HWP 첨부 + 본문 표).
   - **한계**: 표준 API 없음. 정규식/HTML 파싱 필요. 발표 양식이 바뀌면 깨짐.

2. **KITA (한국무역협회)** — `tradedata.go.kr` 무역통계 시스템.
   - 공공데이터포털(data.go.kr) 경유 OpenAPI 일부 제공.
   - 신청 후 활용 신청서 검토 → 키 발급 (수일 소요).
   - **한계**: API 카탈로그가 자주 바뀜. UI에서 직접 CSV 다운로드가 더 안정적일 수 있음.

**권장 운영**:
- **1차**: 매월 1~3일에 산업부 보도자료 페이지를 polling, "수출 ___억 달러" 패턴 정규식 추출.
- **2차 (검증)**: ECOS `901Y014` 계열을 D+10~14일에 호출하여 확정치로 갱신.
- **개인용 단순 구현 권장**: 수동 1줄 입력 폼을 대시보드에 두는 것도 합리적 (월 1회).

### 2.3 시장 데이터 (Yahoo Finance / Stooq)

#### yfinance (비공식, Python 라이브러리)

```python
import yfinance as yf
df = yf.download("^KS11 ^GSPC ^VIX KRW=X", period="2y", interval="1d")
```

**주요 티커**:
| 자산 | 티커 |
|------|------|
| KOSPI | `^KS11` |
| KOSDAQ | `^KQ11` |
| S&P 500 | `^GSPC` |
| Nasdaq Composite | `^IXIC` |
| VIX | `^VIX` |
| MOVE Index | `^MOVE` |
| USD/KRW | `KRW=X` |
| DXY (ICE) | `DX-Y.NYB` |
| WTI 선물 | `CL=F` |
| 금 선물 | `GC=F` |
| 구리 선물 | `HG=F` |
| 미 10Y 금리 (yfinance) | `^TNX` |

**경고**:
- 비공식 API. Yahoo가 갑자기 endpoint를 바꾸면 라이브러리 업데이트 전까지 다운.
- 이용약관상 "personal use"만 명시. 상업 운영은 회색지대.
- **반드시 폴백 소스(Stooq, FRED)와 함께 사용**. SQLite에 캐싱하여 단일 실패점 회피.

#### Stooq (CSV 다운로드)

```
GET https://stooq.com/q/d/l/?s=^spx&i=d         # S&P 500 일별 CSV
GET https://stooq.com/q/d/l/?s=usdkrw&i=d       # USD/KRW
```

- 인증 없음, robots.txt에서 일반적인 다운로드는 허용.
- yfinance 다운 시 1차 폴백으로 매우 유용.
- **한계**: rate limit 명시 없음, 과도 호출 시 IP 차단 가능. 1심볼당 1일 1회 정도로 제한.

### 2.4 KOSPI EPS 같은 어려운 지표

**KOSPI 12M Forward EPS는 무료 공식 소스가 사실상 없다.**

| 옵션 | 비용 | 안정성 | 추천도 |
|------|------|--------|--------|
| FnGuide/WiseFn 유료 구독 | 월 수만~수십만원 | 높음 | △ (비용 목표 위배) |
| 증권사 리서치 PDF 수동 추출 | 무료 | 낮음 (매월 손작업) | △ |
| **수출 YoY 프록시** (`KR_EXP` YoY) | 무료 | 중간 | **권장** |
| KOSPI Trailing P/E + 수출로 추정 | 무료 | 낮음 | △ |
| KRX 공시 분기 EPS 집계 | 무료, 분기 지연 큼 | 중간 | △ |

**권장 결론**: 본 프로젝트에서는 **`KR_EXP YoY`를 KOSPI 이익 모멘텀 프록시로 사용**한다. 한국 수출 YoY와 KOSPI 12M Fwd EPS YoY는 역사적으로 상관계수 0.7+가 알려져 있다. Phase 3 시그널 설계에서 이 프록시 사용을 명시할 것.

추가로, 사용자가 원하면 대시보드 "Manual override" 입력 칸을 두어 월 1회 수동 입력 가능하게 한다.

---

## 3. API 키 발급 가이드

### FRED
1. https://fred.stlouisfed.org/docs/api/api_key.html 접속.
2. St. Louis Fed 계정 생성 (이메일 + 비밀번호).
3. "Request API Key" → 사용 목적 자유서술 → 즉시 발급 (수 초).
4. 32자 영문자/숫자 키.

### ECOS (한국은행)
1. https://ecos.bok.or.kr/api/ 접속.
2. "API 서비스 → 인증키 신청" 클릭.
3. 이메일, 활용 목적 입력 → 즉시 발급 (이메일로 키 수신).
4. 1일 10,000 요청 한도.

### KITA / 공공데이터포털 (수출입 OpenAPI 사용 시)
1. https://www.data.go.kr/ 회원가입.
2. "수출입 무역통계" 검색 → 활용신청.
3. 자동승인 또는 1~2일 영업일 검토. 일부 API는 신청서 첨부 필요.

### Alpha Vantage (선택, 폴백용)
1. https://www.alphavantage.co/support/#api-key
2. 이메일만 입력 → 즉시 발급.
3. 500 req/day, 5 req/min 제한. 무료티어로 충분.

---

## 4. 환경변수 표준

`.env.local` (Next.js) 또는 `.env` (Node.js):

```bash
# 필수
FRED_API_KEY=                  # FRED (미국 매크로 1차)
ECOS_API_KEY=                  # 한국은행 ECOS (한국 매크로 1차)

# 선택 (폴백/보조)
ALPHA_VANTAGE_KEY=             # Alpha Vantage (시장 데이터 폴백)
PUBLIC_DATA_API_KEY=           # data.go.kr (KITA/산업부)

# 운영
DATA_REFRESH_CRON=0 0 * * *    # KST 09:00 = UTC 00:00
DB_PATH=./data/dashboard.sqlite
LOG_LEVEL=info
```

`.env.example`을 레포에 커밋, 실제 `.env.local`은 `.gitignore`에 포함.

---

## 5. 수집 아키텍처 권장

### 5.1 수집 주기 (자산 그룹별)

| 그룹 | 갱신 주기 | 트리거 | 근거 |
|------|----------|--------|------|
| 월별 매크로 (CPI/PPI/한국수출) | 1일 1회 cron | KST 09:00 | 발표는 월 1회, 새 데이터 도착 여부만 체크 |
| 일별 금리/스프레드/VIX | 1일 1회 cron | KST 09:00 (미국장 마감 후) | 미국장 종가 반영 |
| 시장 데이터 (KOSPI/USDKRW) | 30분 polling (장중) | 한국장 09:00~15:30 KST | 사용자 중기 시간축이라 실시간 불필요 |
| 글로벌 지수/원자재 | 30분 polling (장중) | 미국장 시간 (KST 23:30~06:00) | 야간만 활성, 주간은 cron 1회 |

### 5.2 캐싱 전략 (SQLite)

```sql
CREATE TABLE observations (
  series_id TEXT NOT NULL,
  date TEXT NOT NULL,          -- ISO 8601
  value REAL,
  source TEXT NOT NULL,        -- 'fred' | 'ecos' | 'yfinance' | 'stooq' | 'manual'
  fetched_at TEXT NOT NULL,
  PRIMARY KEY (series_id, date, source)
);
CREATE INDEX idx_obs_series_date ON observations(series_id, date DESC);
```

- 모든 API 응답을 SQLite에 영속화 → API 다운 시에도 히스토리 보존.
- 수집기는 "마지막 관측일 이후 데이터만 incremental fetch" → rate limit + 트래픽 절약.
- 동일 시리즈에 대해 여러 소스 동시 저장 → 폴백 자동 비교 가능.

### 5.3 Rate Limit & 재시도

- **FRED**: 120 req/min. 24개 지표 일 1회는 1초도 안 걸림. 여유 충분.
- **ECOS**: 10,000 req/day. 개인용 무한대.
- **yfinance**: 명시 없으나 1심볼당 1분 1회 이내 권장. 25심볼이면 1분 spread.
- **Stooq**: 1심볼당 일 1회 이내 권장 (폴백 전용).

**재시도 정책** (지수 백오프):
```
attempt 1: 즉시
attempt 2: 1s 대기
attempt 3: 2s 대기
attempt 4: 4s 대기
attempt 5: 실패 → 폴백 소스로 전환 + 알림 이벤트 기록
```

### 5.4 운영 토폴로지

```
[Vercel Cron (Hobby, 무료)]
   └─→ /api/cron/daily   (KST 09:00)
         ├─→ FRED 14개 시리즈 fetch
         ├─→ ECOS 4개 시리즈 fetch
         ├─→ yfinance 5개 티커 fetch (서버 측 fetch 또는 GitHub Actions)
         └─→ SQLite upsert + 시그널 재계산
[GitHub Actions (선택, 무료)]
   └─→ 30분 polling: 시장 데이터만
```

> Vercel Hobby에서 cron은 일 2회까지 무료. 더 필요하면 GitHub Actions schedule (cron, 무료 분 한도 내) 병행.

---

## 6. 데이터 가용성 경고 (사용자 메시지)

다음은 사용자에게 그대로 전달해도 되는 문구다.

### 무료로 어려운 지표

| 지표 | 상태 | 권장 처리 |
|------|------|----------|
| KOSPI 12M Fwd EPS | 무료 공식 소스 없음 | 한국 수출 YoY를 프록시로 사용. 대시보드에 "프록시" 뱃지 표시. |
| MOVE Index | FRED 미수록, yfinance만 (비공식) | 일별 수집, 30일 이상 갱신 실패 시 알림. |
| 한국 외국인 순매수 | KRX 무료 데이터 있으나 파싱 복잡 | Phase 4에서 검토. 초기 버전 제외. |

### 비공식 API 안정성 경고

> **yfinance / Stooq는 비공식 데이터 소스입니다.** Yahoo / Stooq가 정책을 변경하면 예고 없이 차단될 수 있으며, 본 대시보드는 이 경우 FRED/ECOS의 동등 시리즈로 자동 폴백합니다. KOSPI, USD/KRW의 일중 갱신이 멈춘다면 해당 소스 변경 가능성이 높습니다.

### 발표 일정 주의

- **CPI/PPI**: 미국 노동통계국(BLS) 일정 기준 월 2주차 발표. FRED는 발표 당일 ~ 다음날 갱신.
- **한국 수출입**: 매월 1일 09:00 (KST) 산업통상자원부 발표. 익월 15일 통관 확정치, 익월 말 ECOS 반영.
- **공휴일 처리**: 한국 공휴일에는 cron이 실행되지만 ECOS/KRX는 데이터가 없을 수 있음 → 결측 허용, 알림 노이즈 방지.

### 사용자에게 보내는 한 줄 요약 메시지

> 본 대시보드의 24개 지표 중 23개는 무료 공식 API(FRED, ECOS, 산업부)에서 수집합니다. **KOSPI 12M Fwd EPS만 무료 정공 소스가 없어 "한국 수출 YoY"를 이익 모멘텀 프록시로 사용**합니다. 운영 비용은 0원 목표를 충족하며, 비공식 API(yfinance/Stooq)는 폴백을 두어 단일 장애점이 없게 설계했습니다.

---

## 7. 다음 단계 (Phase 3로 인계)

- [ ] 본 매핑의 시리즈 ID/통계표 코드를 코드 상수로 추출 (`src/lib/datasources/series.ts`).
- [ ] Phase 3 시그널 설계에서 `KR_EXP YoY → KOSPI 이익 모멘텀 프록시` 매핑 명시.
- [ ] FRED 키, ECOS 키 발급 (사용자 직접). `.env.local` 작성.
- [ ] ECOS 통계표 코드는 구현 단계에서 ECOS 통계검색 UI에서 최종 확정 (특히 `731Y001` 환율, `301Y013` 국제수지).
- [ ] yfinance 차단 시 자동 Stooq 폴백 + 사용자 인앱 알림 시나리오 구현.
