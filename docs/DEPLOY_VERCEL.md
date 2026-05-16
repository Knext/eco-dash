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

## 데이터 영속성 한계 (중요)

**Vercel serverless filesystem은 ephemeral입니다.** 현재 코드는 `better-sqlite3`로 `data/timeseries.db`에 저장하는데, Vercel 함수가 콜드 스타트되면 이 파일이 새 임시 디렉터리에 다시 생성됩니다 — 즉 **이전 데이터가 사라집니다**.

운영 옵션:

| 옵션 | 적합한 경우 |
|------|-----------|
| **로컬 모드 유지 + Vercel은 데모용** | 매번 cron이 5년 백필을 다시 받아도 무관한 경우 (FRED 무료 한도 내) |
| **Turso (libSQL, SQLite 호환)** | 영속성 필요. `better-sqlite3` → `@libsql/client` 마이그레이션 (queries.ts 전체 async 변환). 무료 9GB |
| **Vercel Postgres** | 강한 SQL 필요 시. 무료 60시간/월 한도 |
| **Supabase** | 추가 기능(Auth/Realtime) 필요 시 |

권장: 우선 Vercel에 배포만 해서 UI를 확인하고, 영속성이 필요하면 Turso로 마이그레이션. 마이그레이션은 별도 PR로 진행.

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
