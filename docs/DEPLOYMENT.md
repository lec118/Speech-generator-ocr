# Deployment Guide

이 문서는 화법 생성 OCR 애플리케이션의 배포 프로세스를 설명합니다.

## 목차

- [배포 워크플로우](#배포-워크플로우)
- [Preview 배포](#preview-배포)
- [Production 배포](#production-배포)
- [환경 변수 설정](#환경-변수-설정)
- [수동 배포](#수동-배포)
- [롤백 절차](#롤백-절차)
- [트러블슈팅](#트러블슈팅)

---

## 배포 워크플로우

### 자동화된 배포 파이프라인

```
┌─────────────────────────────────────────────────────────────┐
│ 1. PR 생성 (main 브랜치 대상)                                │
│    → Preview Deployment Workflow 트리거                      │
│    → 미리보기 링크 PR 코멘트로 제공                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. PR 리뷰 및 승인                                           │
│    → CI 통과 확인 (Lint, Type Check, Tests, Build)         │
│    → Preview 환경에서 수동 테스트                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. main 브랜치 머지                                          │
│    → Production Deployment Workflow 자동 트리거              │
│    → Release Notes 자동 생성                                 │
│    → 프로덕션 배포 실행                                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. 배포 후 검증                                              │
│    → Health check 실행                                       │
│    → 모니터링 대시보드 확인                                  │
│    → 필요 시 롤백                                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Preview 배포

Preview 배포는 main 브랜치로의 PR이 생성되거나 업데이트될 때 자동으로 실행됩니다.

### 트리거 조건

- `pull_request` 이벤트 (main 브랜치 대상)
- 이벤트 타입: `opened`, `synchronize`, `reopened`

### 워크플로우 단계

1. **코드 체크아웃**
2. **의존성 설치**: `pnpm install --frozen-lockfile`
3. **빌드**: `pnpm -C apps/web build`
4. **Vercel 배포**: Preview 환경
5. **PR 코멘트**: Preview URL 자동 추가

### Preview 환경 제약사항

- Mock OpenAI API 키 사용 (실제 생성 제한적)
- `DAILY_PAGE_LIMIT`: 200
- `CONCURRENCY_HINT`: 10

### PR 코멘트 예시

```markdown
## 🚀 Preview Deployment

Your preview deployment is ready!

**Preview URL**: https://your-app-preview-xyz.vercel.app

### 📋 Preview Details
- **Environment**: Preview
- **Branch**: `feature/new-option`
- **Commit**: `abc123def456`
- **Build**: [#42](https://github.com/org/repo/actions/runs/123)

### 🧪 Testing Checklist
- [ ] PDF 업로드 기능 확인
- [ ] 길이/톤 옵션 선택 확인
- [ ] 화법 생성 동작 확인
- [ ] 결과 다운로드 확인
- [ ] 토큰/비용 표시 확인
```

---

## Production 배포

Production 배포는 main 브랜치에 코드가 머지되면 자동으로 실행됩니다.

### 트리거 조건

- `push` 이벤트 (main 브랜치)
- `workflow_dispatch` (수동 트리거)

### 워크플로우 단계

#### Job 1: Release Notes 생성
1. 마지막 머지 커밋 메시지 추출
2. 변경된 파일 목록 수집
3. 배포 정보 수집 (SHA, 배포자, 타임스탬프)
4. 롤백 지침 자동 생성
5. Artifact로 업로드 (90일 보관)

#### Job 2: Production 배포
1. **테스트 실행**: `pnpm test` (필수 통과)
2. **빌드**: `pnpm build`
3. **Vercel 배포**: Production 환경 (`--prod`)
4. **배포 메타데이터 저장**: Artifact 업로드
5. **배포 요약 생성**: GitHub Step Summary

#### Job 3: 배포 후 검증
1. 30초 대기 (배포 안정화)
2. Health check 실행
3. 검증 성공 알림

#### Job 4: 롤백 (실패 시)
- 수동 롤백 지침 제공
- Vercel Dashboard 링크
- Vercel CLI 명령어

### 배포 성공 요약 예시

```markdown
## 🚀 Production Deployment Successful

**Deployment URL**: https://your-app.vercel.app
**Commit**: `abc123def456`
**Deployed by**: username

### Environment Variables
- DAILY_PAGE_LIMIT: 200
- CONCURRENCY_HINT: 10

### Rollback
If needed, use: `git revert -m 1 abc123def456`
```

---

## 환경 변수 설정

### GitHub Secrets

다음 secrets을 GitHub repository settings에 추가해야 합니다:

#### 필수 Secrets

| Secret | 설명 | 예시 |
|--------|------|------|
| `VERCEL_TOKEN` | Vercel API 토큰 | `vJxxx...` |
| `VERCEL_ORG_ID` | Vercel 조직 ID | `team_xxx...` |
| `VERCEL_PROJECT_ID` | Vercel 프로젝트 ID | `prj_xxx...` |
| `OPENAI_API_KEY` | OpenAI API 키 (Production) | `sk-proj-xxx...` |

#### 선택적 Secrets

| Secret | 설명 | 기본값 |
|--------|------|--------|
| `OPENAI_API_KEY_PREVIEW` | OpenAI API 키 (Preview) | Mock 키 사용 |
| `OPENAI_BASE_URL` | OpenAI API 베이스 URL | - |
| `DAILY_PAGE_LIMIT` | 일일 페이지 제한 | `200` |
| `CONCURRENCY_HINT` | 동시 사용자 힌트 | `10` |

### Vercel Secrets 설정 방법

1. **Vercel Dashboard 접속**
   ```
   https://vercel.com/dashboard
   ```

2. **프로젝트 선택** → Settings → Environment Variables

3. **추가할 환경 변수**:
   ```bash
   OPENAI_API_KEY=sk-proj-your-key-here
   OPENAI_BASE_URL=https://api.openai.com/v1  # 선택
   DAILY_PAGE_LIMIT=200
   CONCURRENCY_HINT=10
   ```

4. **환경 선택**:
   - Preview: Preview 배포용
   - Production: Production 배포용

---

## 수동 배포

### 로컬 빌드 및 실행

```bash
# 1. 의존성 설치
pnpm install

# 2. 빌드
pnpm -C apps/web build

# 3. 프로덕션 서버 실행
pnpm -C apps/web start
```

**접속**: http://localhost:3000

### Vercel CLI 배포

#### 설치

```bash
npm i -g vercel
```

#### Preview 배포

```bash
cd apps/web
vercel
```

#### Production 배포

```bash
cd apps/web
vercel --prod
```

**주의**: Vercel CLI를 사용하려면 `vercel login`으로 먼저 인증해야 합니다.

### Docker 배포 (선택)

```dockerfile
# Dockerfile (apps/web/Dockerfile)
FROM node:18-alpine AS base

# 의존성 설치
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# 빌드
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable pnpm && pnpm run build

# 프로덕션
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
```

**빌드 및 실행**:
```bash
docker build -t speech-generator-ocr .
docker run -p 3000:3000 \
  -e OPENAI_API_KEY=sk-your-key \
  -e DAILY_PAGE_LIMIT=200 \
  speech-generator-ocr
```

---

## 롤백 절차

배포 후 문제가 발생한 경우 롤백을 수행합니다.

### Option 1: Git Revert (권장)

```bash
# 1. 문제가 있는 머지 커밋 찾기
git log --oneline --merges

# 2. 머지 커밋 revert (-m 1: 첫 번째 부모 유지)
git revert -m 1 <merge_commit_sha>

# 3. main 브랜치에 푸시
git push origin main

# 4. 자동 배포 트리거 대기
```

**장점**: Git 히스토리에 롤백 기록 보존, 추적 가능

### Option 2: Vercel CLI Rollback

```bash
# 1. 최신 배포로부터 롤백
vercel rollback

# 또는 특정 배포로 롤백
vercel rollback <deployment_url>
```

**장점**: 빠른 롤백, Git 히스토리 불필요

### Option 3: Vercel Dashboard (수동)

1. **Vercel Dashboard 접속**
   ```
   https://vercel.com/dashboard
   ```

2. **프로젝트 선택** → Deployments 탭

3. **이전 안정 버전 선택**

4. **"Promote to Production" 클릭**

**장점**: UI를 통한 직관적 작업, 특정 배포 선택 가능

### 롤백 후 확인사항

```bash
# Health check
curl https://your-app.vercel.app/api/health

# 주요 기능 테스트
# - PDF 업로드
# - 화법 생성
# - 결과 다운로드

# 에러 로그 확인
vercel logs <deployment_url>
```

---

## 롤백 시나리오별 가이드

### 시나리오 1: API 에러 급증

**증상**: 500 에러율 급증

**롤백 절차**:
1. Vercel Dashboard에서 즉시 이전 배포로 rollback (Option 3)
2. 에러 로그 수집: `vercel logs`
3. 원인 파악 후 핫픽스 PR 생성

### 시나리오 2: 환경 변수 누락

**증상**: "Missing OPENAI_API_KEY" 에러

**해결 방법** (롤백 불필요):
1. Vercel Dashboard → Settings → Environment Variables
2. 누락된 변수 추가
3. Redeploy 버튼 클릭

### 시나리오 3: Breaking Change

**증상**: 기존 사용자 워크플로우 중단

**롤백 절차**:
1. Git revert로 변경사항 되돌리기 (Option 1)
2. 마이그레이션 가이드 작성
3. 점진적 재배포 계획 수립

---

## 트러블슈팅

### 문제: Preview 배포 실패

**원인**: Vercel secrets 미설정

**해결**:
```bash
# GitHub repository secrets 확인
Settings → Secrets and variables → Actions

# 필수 확인:
- VERCEL_TOKEN
- VERCEL_ORG_ID
- VERCEL_PROJECT_ID
```

### 문제: Production 배포 후 API 키 에러

**원인**: Vercel 환경변수 누락

**해결**:
```bash
# Vercel Dashboard에서 설정
Settings → Environment Variables → Production

# 추가 필요:
OPENAI_API_KEY=sk-proj-xxx
```

### 문제: 빌드 실패 (TypeScript 에러)

**원인**: Type check 실패

**해결**:
```bash
# 로컬에서 타입 체크
pnpm type-check

# 에러 수정 후 재커밋
git add .
git commit -m "fix: type errors"
git push
```

### 문제: 테스트 실패로 배포 차단

**원인**: 필수 테스트 미통과

**해결**:
```bash
# 로컬에서 테스트 실행
pnpm test

# 실패 원인 파악 및 수정
# 또는 hotfix PR 생성
```

---

## 배포 체크리스트

### 배포 전

- [ ] 모든 CI 체크 통과 (Lint, Type Check, Tests, Build)
- [ ] PR 리뷰 완료
- [ ] Preview 환경에서 수동 테스트 완료
- [ ] Breaking changes 문서화
- [ ] 환경 변수 설정 확인
- [ ] Rollback 계획 수립

### 배포 중

- [ ] GitHub Actions workflow 모니터링
- [ ] Release notes artifact 다운로드
- [ ] Deployment URL 확인

### 배포 후

- [ ] Health check 통과 확인
- [ ] 주요 기능 수동 테스트
  - [ ] PDF 업로드
  - [ ] 길이/톤 옵션 선택
  - [ ] 화법 생성 (개별/일괄)
  - [ ] 결과 다운로드
  - [ ] 토큰/비용 표시
- [ ] 에러 로그 모니터링 (30분)
- [ ] 성능 메트릭 확인
- [ ] 필요 시 rollback 실행

---

## 플랫폼별 배포 가이드

### Vercel (권장)

**장점**:
- Zero-config Next.js 지원
- 자동 HTTPS, CDN
- Preview 배포 자동화
- 간편한 롤백

**설정**: [Vercel 배포 가이드](https://vercel.com/docs)

### AWS (대안)

**서비스**: AWS Amplify, ECS, or Lambda

**배포 명령**:
```bash
# AWS Amplify
amplify push

# ECS
aws ecs update-service --service speech-ocr-service
```

### Azure (대안)

**서비스**: Azure Static Web Apps, App Service

**배포 명령**:
```bash
az webapp up --name speech-ocr-app
```

---

## 모니터링 및 알림

### 권장 모니터링 도구

- **에러 트래킹**: Sentry, Bugsnag
- **로그**: Vercel Logs, Datadog
- **성능**: Vercel Analytics, Google Analytics
- **업타임**: UptimeRobot, Pingdom

### 알림 설정

```yaml
# .github/workflows/notify-deployment.yml
# Slack, Discord, Email 알림 설정 예시
```

---

## 추가 리소스

- [Vercel 공식 문서](https://vercel.com/docs)
- [Next.js 배포 가이드](https://nextjs.org/docs/deployment)
- [GitHub Actions 문서](https://docs.github.com/en/actions)
- [프로젝트 README](../README.md)
- [아키텍처 문서](./adr/0001-architecture.md)

---

**Last Updated**: 2025-10-21
**Maintained by**: Development Team
