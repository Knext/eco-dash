# Vercel 배포 가이드

이 문서는 GitHub Actions로 Vercel에 자동 배포하는 방법을 설명합니다.

## 흐름

```
push to main          → test → deploy-production (URL을 GitHub release env에 기록)
PR open / update      → test → deploy-preview    (PR에 preview URL 코멘트)
```

## 사전 준비

### 1. Vercel 프로젝트 생성

```bash
# 로컬에서 한 번만
npx vercel link
# 메시지에 따라 새 프로젝트로 연결 (~30초)
```

연결되면 `.vercel/project.json`이 생기는데 GitHub에 push하지 않습니다 (`.gitignore`는 자동 처리).

### 2. GitHub Secrets 등록

리포지토리 Settings → Secrets and variables → Actions:

| Secret | 값 | 발급 |
|--------|---|------|
| `VERCEL_TOKEN` | Vercel personal access token | https://vercel.com/account/tokens |
| `CRON_SECRET` | 32자 이상 임의 문자열 | `openssl rand -hex 32` |

### 3. Vercel 환경변수 설정

Vercel 대시보드 → 프로젝트 → Settings → Environment Variables에 다음을 모두 추가 (production / preview 양쪽):

| 변수 | 값 |
|------|---|
| `FRED_API_KEY` | https://fred.stlouisfed.org/docs/api/api_key.html |
| `ECOS_API_KEY` | https://ecos.bok.or.kr/api/ |
| `CRON_SECRET` | GitHub Secrets와 동일한 값 |
| `NEXT_PUBLIC_BASE_URL` | `https://your-app.vercel.app` (배포 후 채우기) |
| `TURSO_DATABASE_URL` | `libsql://...turso.io` (아래 Turso 섹션 참조) |
| `TURSO_AUTH_TOKEN` | Turso 토큰 (아래 Turso 섹션 참조) |
| `PUBLIC_DATA_API_KEY` | (선택) data.go.kr 키 |

### 4. Vercel cron 자동 인증

`vercel.json`의 `crons` 필드가 등록되면 Vercel이 매일 자정과 자정+5분에 `/api/cron/fetch`와 `/api/cron/evaluate`를 호출합니다.

Vercel은 `CRON_SECRET` 환경변수가 설정되어 있을 때 자동으로 `Authorization: Bearer ${CRON_SECRET}` 헤더를 붙여 호출합니다. 현재 코드의 `checkBearer()`가 이 헤더를 검증합니다. **추가 코드 변경 불필요.**

## 첫 배포

```bash
# 로컬에서 한 번만
vercel --prod
```

또는 main 브랜치에 push하면 GitHub Actions가 자동으로 `vercel deploy --prebuilt --prod`을 실행합니다.

## Turso 데이터베이스 설정 (필수)

Vercel serverless의 `/var/task`는 read-only, `/tmp`는 ephemeral이라 로컬 파일 SQLite를 그대로 쓸 수 없습니다. 이 프로젝트는 **Turso (libSQL, SQLite 호환 매니지드 DB)** 를 사용합니다.

### 1. Turso DB 생성

```bash
# CLI 설치 (한 번만)
curl -sSfL https://get.tur.so/install.sh | bash

# 로그인 (GitHub OAuth)
turso auth signup        # 또는 turso auth login

# DB 생성 (이름은 원하는 대로, 예: eco-dash)
turso db create eco-dash

# 접속 URL 확인 → TURSO_DATABASE_URL
turso db show eco-dash --url
# 예: libsql://eco-dash-knext.turso.io

# Auth Token 발급 → TURSO_AUTH_TOKEN
turso db tokens create eco-dash
# 출력된 토큰 복사 (재발급 가능, 다시 보기 불가)
```

또는 웹 콘솔: https://app.turso.tech → **New Database** → URL과 token 복사.

### 2. Vercel 환경변수 추가

Settings → Environment Variables → 다음 2개를 Production+Preview에 추가:

```
TURSO_DATABASE_URL=libsql://eco-dash-knext.turso.io
TURSO_AUTH_TOKEN=eyJhbGciOi...  (Turso CLI 출력값 전체)
```

`TURSO_DATABASE_URL`이 설정되면 `db/client.ts`가 자동으로 Turso로 전환됩니다 (없으면 로컬 SQLite file).

### 3. 초기 데이터 주입

**옵션 A — 로컬에서 Turso로 5년 백필 (권장, 즉시 데이터 확보)**:

```bash
# .env.local에 임시 추가
echo "TURSO_DATABASE_URL=libsql://..." >> .env.local
echo "TURSO_AUTH_TOKEN=..." >> .env.local

npm run backfill   # 24지표 × 5년 → Turso로 직접 저장 (5~10분)
npm run manual-entry -- KR_EXPORT 2026-04-01 48.0 "산자부 4월"
# ... 나머지 KR 데이터도 manual-entry로 입력
```

`.env.local`에 Turso URL이 남아 있으면 로컬 dev도 Turso를 사용. 로컬 SQLite로 되돌리려면 두 줄 주석/삭제.

**옵션 B — Vercel cron이 점진적으로 채움**:

첫 배포 후 매일 cron(KST 09:00)이 데이터를 누적. 1주일 이내로 의미 있는 시계열 확보. 단, 처음 며칠 UI는 거의 비어 있음.

### 4. 무료 한도

| 항목 | 한도 | 우리 사용량 |
|---|---|---|
| 저장 | 9 GB | 24지표 × 5년 ≈ 50 MB |
| Row reads | 1B / 월 | 일별 polling × 30일 = ~수만 |
| Row writes | 25M / 월 | 일 24지표 × 30일 = 720 writes |
| DB 개수 | 1개 (무료 플랜) | 1개 사용 |

### 5. 검증

```bash
# 로컬에서
npm run healthcheck
# → TURSO_DATABASE_URL이 표시되고 timeseries rows > 0이면 OK

# Vercel 배포 후
curl -i -H "Authorization: Bearer $CRON_SECRET" https://your-app.vercel.app/api/cron/fetch
# → 200 + JSON에 success: 24 (또는 manual 폴백 분 빼고)
```

### 6. 백업 / 복구

Turso는 자동 백업 + point-in-time recovery 제공 (유료 플랜). 무료 플랜은:

```bash
turso db shell eco-dash ".dump" > backup.sql
turso db shell new-db < backup.sql
```

## 트러블슈팅

### `Error: [env] Invalid environment configuration: CRON_SECRET`
Vercel 환경변수에 `CRON_SECRET`이 설정되지 않음. 위 "3. Vercel 환경변수 설정" 단계 다시 확인.

### Vercel cron이 401을 반환
GitHub Secrets의 `CRON_SECRET`과 Vercel 환경변수 `CRON_SECRET`이 다른 값. **같은 값**이어야 합니다.

### 빌드 시 `better-sqlite3` native compile 실패
`package.json`의 Node 버전이 Vercel 빌드 환경과 호환되는지 확인. Vercel은 기본 Node 20을 사용하므로 현재 설정 (`"node": ">=20.0.0"`)과 일치합니다.

### Preview deploy가 main과 같은 DB를 봄
SQLite 파일이 함수 인스턴스 내부에 있으므로 환경별로 격리. 다만 ephemeral이라 양쪽 다 콜드 스타트마다 빈 DB로 시작.

## 관련 파일

- `.github/workflows/deploy.yml` — GitHub Actions 워크플로우 (test + preview + production)
- `vercel.json` — Vercel 빌드 설정 + cron 스케줄 + maxDuration
- `.vercelignore` — 배포 패키지에 포함하지 않을 파일 (`_workspace`, `.claude`, 테스트 등)
