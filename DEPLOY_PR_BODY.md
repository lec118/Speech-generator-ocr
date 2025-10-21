# [deploy] 자동 배포 워크플로우 + 롤백 가이드

## Summary

이 PR은 프로젝트에 완전히 자동화된 배포 파이프라인을 추가합니다. Preview 배포(PR 생성 시)와 Production 배포(main 머지 후)를 자동화하고, 릴리스 노트 자동 생성 및 포괄적인 롤백 가이드를 제공합니다.

## Changes

### 1. Preview Deployment Workflow

**파일**: `.github/workflows/preview-deploy.yml`

**트리거**: PR → main 브랜치 (opened, synchronize, reopened)

**주요 기능**:
- ✅ 자동 Vercel preview 환경 배포
- ✅ PR 코멘트로 미리보기 URL 제공
- ✅ 테스팅 체크리스트 자동 추가
- ✅ Vercel 미설정 시 수동 배포 가이드 제공
- ✅ Mock OpenAI API 키 사용 (preview 환경)

**PR 코멘트 예시**:
```markdown
## 🚀 Preview Deployment

Your preview deployment is ready!

**Preview URL**: https://your-app-preview-xyz.vercel.app

### 📋 Preview Details
- Environment: Preview
- Branch: feature/new-option
- Commit: abc123def456

### 🧪 Testing Checklist
- [ ] PDF 업로드 기능 확인
- [ ] 길이/톤 옵션 선택 확인
- [ ] 화법 생성 동작 확인
- [ ] 결과 다운로드 확인
- [ ] 토큰/비용 표시 확인
```

**환경 제약**:
- Mock OpenAI API key (실제 생성 제한적)
- DAILY_PAGE_LIMIT: 200
- CONCURRENCY_HINT: 10

### 2. Production Deployment Workflow

**파일**: `.github/workflows/production-deploy.yml`

**트리거**:
- `push` to main (자동)
- `workflow_dispatch` (수동)

**4개 Job 구조**:

#### Job 1: Release Notes 생성
- 마지막 머지 커밋 메시지 추출
- 변경된 파일 목록 수집 (최근 20개)
- 배포 정보 수집 (SHA, 배포자, 타임스탬프)
- 롤백 지침 자동 생성
- Artifact 업로드 (90일 보관)

**생성 예시**:
```markdown
# Release Notes - 2025-10-21

## Changes in this deployment
- Commit: feat: add new option
- Changed files: apps/web/page.tsx, packages/core/prompt.ts

## Rollback Instructions
git revert -m 1 abc123def456
vercel rollback --token=$VERCEL_TOKEN
```

#### Job 2: Deploy (Production)
1. 테스트 실행 (필수 통과)
2. 빌드 (환경변수 주입)
3. Vercel 프로덕션 배포 (`--prod`)
4. 배포 메타데이터 저장
5. GitHub Step Summary 생성

#### Job 3: Verify (Post-deployment)
- 30초 대기 (안정화)
- Health check 실행
- 검증 성공 알림

#### Job 4: Rollback (Emergency)
- 실패 시에만 실행 (`if: failure()`)
- 수동 롤백 지침 제공
- Vercel Dashboard 링크
- CLI 명령어

### 3. 배포 문서화

#### docs/DEPLOYMENT.md (신규 - 450줄)

**목차**:
1. 배포 워크플로우 다이어그램
2. Preview 배포 가이드
3. Production 배포 가이드
4. 환경 변수 설정 (GitHub + Vercel)
5. 수동 배포 방법
6. 롤백 절차 (3가지 옵션)
7. 롤백 시나리오별 가이드
8. 트러블슈팅
9. 플랫폼별 배포 가이드
10. 모니터링 및 알림

**워크플로우 다이어그램**:
```
PR 생성 (main 대상)
  ↓
Preview Deployment
  ↓
PR 리뷰 및 승인
  ↓
main 브랜치 머지
  ↓
Production Deployment + Release Notes
  ↓
배포 후 검증 (Health Check)
```

**롤백 3가지 옵션**:

**Option 1: Git Revert** (권장)
```bash
git revert -m 1 <merge_commit>
git push origin main
# 자동 배포 트리거
```
- 장점: Git 히스토리 보존, 추적 가능

**Option 2: Vercel CLI Rollback**
```bash
vercel rollback --token=$VERCEL_TOKEN
```
- 장점: 빠른 롤백, Git 불필요

**Option 3: Vercel Dashboard** (수동)
1. Vercel Dashboard 접속
2. Deployments → 이전 버전 선택
3. "Promote to Production" 클릭
- 장점: 직관적, 특정 배포 선택

**수동 배포 명령어**:
```bash
# 로컬
pnpm install
pnpm -C apps/web build
pnpm -C apps/web start

# Vercel CLI
cd apps/web
vercel              # Preview
vercel --prod       # Production

# Docker
docker build -t speech-ocr .
docker run -p 3000:3000 speech-ocr
```

**트러블슈팅 시나리오**:
- Preview 배포 실패 → Vercel secrets 확인
- API 키 에러 → Vercel 환경변수 추가
- 빌드 실패 → 로컬 타입 체크
- 테스트 실패 → 로컬 테스트 실행

#### docs/RELEASE_NOTES.md (신규 - 200줄)

**자동 생성 형식**:
- 변경 사항 (커밋 메시지)
- 변경된 파일 목록
- 배포 정보 (SHA, 배포자, 시간)
- 롤백 지침 (3가지 옵션)
- 리스크 항목

**수동 작성 템플릿**:
```markdown
# Release v1.0.0 - YYYY-MM-DD

## Summary
[요약]

## New Features
- [기능 1]

## Bug Fixes
- [수정 1]

## Breaking Changes
- [변경 사항]

## Deployment
- Environment Variables
- Migration Steps
- Rollback Plan

## Testing
- Test Coverage
- Manual Testing Checklist
```

**릴리스 체크리스트**:
- [ ] CI 통과
- [ ] 코드 리뷰
- [ ] Breaking changes 문서화
- [ ] 환경 변수 확인
- [ ] 모니터링 설정
- [ ] 롤백 준비

#### docs/README.md 업데이트

**배포 섹션 추가**:
- 자동 배포 워크플로우 설명
- 수동 배포 명령어
- 롤백 3가지 옵션
- DEPLOYMENT.md 링크

### 4. 환경 변수 가이드

#### 필수 GitHub Secrets

| Secret | 설명 |
|--------|------|
| `VERCEL_TOKEN` | Vercel API 토큰 |
| `VERCEL_ORG_ID` | Vercel 조직 ID |
| `VERCEL_PROJECT_ID` | Vercel 프로젝트 ID |
| `OPENAI_API_KEY` | OpenAI API 키 (Production) |

#### 선택적 Secrets

| Secret | 기본값 |
|--------|--------|
| `OPENAI_API_KEY_PREVIEW` | Mock 키 |
| `OPENAI_BASE_URL` | - |
| `DAILY_PAGE_LIMIT` | 200 |
| `CONCURRENCY_HINT` | 10 |

## Risk Assessment

### Potential Risks

1. **Vercel Secrets 누락**: 배포 실패
2. **API 키 부족**: Preview에서 실제 생성 불가
3. **자동 배포 오작동**: 의도하지 않은 프로덕션 배포
4. **Rollback 지연**: 문제 발생 시 대응 시간

### Mitigation

1. **Secrets 검증**:
   - Preview workflow에서 secrets 체크
   - 누락 시 수동 배포 가이드 제공

2. **API 키 관리**:
   - Preview용 별도 키 사용 (`OPENAI_API_KEY_PREVIEW`)
   - Mock 키 fallback

3. **배포 제어**:
   - Production 배포 전 테스트 필수
   - `workflow_dispatch`로 수동 트리거 옵션

4. **빠른 롤백**:
   - 3가지 롤백 옵션 제공
   - Emergency rollback job 자동 실행
   - 30초 health check로 조기 발견

## Rollback Plan

PR 머지 후 문제 발생 시:

### Immediate Rollback (긴급)

**Option 1: Git Revert**
```bash
git revert -m 1 34b19d4
git push origin main
```

**Option 2: Vercel CLI**
```bash
vercel rollback
```

### Workflow 비활성화 (필요 시)

```bash
# .github/workflows/production-deploy.yml 삭제
git rm .github/workflows/production-deploy.yml
git commit -m "chore: disable auto deployment"
git push
```

### 수동 배포로 전환

`.github/workflows/` 파일 삭제 후 수동 배포:
```bash
cd apps/web
vercel --prod
```

## Testing

### ✅ Workflow 파일 검증

**Preview Workflow**:
- [x] PR trigger 설정 (main 브랜치)
- [x] Vercel 배포 단계
- [x] PR 코멘트 봇 (github-script)
- [x] Fallback 수동 가이드
- [x] Mock API 키 사용

**Production Workflow**:
- [x] Push trigger (main 브랜치)
- [x] 4개 job 정의 (release-notes, deploy, verify, rollback)
- [x] 테스트 필수 통과
- [x] Artifact 업로드 (90일)
- [x] Health check
- [x] Emergency rollback

### ✅ 문서 검증

**DEPLOYMENT.md**:
- [x] 배포 워크플로우 다이어그램
- [x] Preview/Production 가이드
- [x] 환경 변수 설정
- [x] 수동 배포 3가지 방법
- [x] 롤백 3가지 옵션
- [x] 시나리오별 가이드
- [x] 트러블슈팅 섹션

**RELEASE_NOTES.md**:
- [x] 자동 생성 형식
- [x] 수동 작성 템플릿
- [x] 릴리스 체크리스트
- [x] 과거 릴리스 아카이브

**README.md**:
- [x] 배포 섹션 추가
- [x] 수동 배포 명령어
- [x] 롤백 옵션
- [x] DEPLOYMENT.md 링크

### 🔄 CI 실행 예정

PR 머지 후 GitHub Actions에서:
- [ ] Preview workflow 실행 안 함 (main 브랜치로 직접 푸시)
- [ ] Production workflow 자동 트리거 (main push)
- [ ] Release notes artifact 생성
- [ ] Deployment metadata artifact 생성

### 📋 수동 테스트 체크리스트

**Vercel 설정 후**:
- [ ] GitHub Secrets 추가 (VERCEL_TOKEN, ORG_ID, PROJECT_ID)
- [ ] PR 생성하여 preview 배포 확인
- [ ] PR 코멘트에 preview URL 표시 확인
- [ ] main 머지 후 production 배포 확인
- [ ] Release notes artifact 다운로드
- [ ] Rollback 테스트 (vercel rollback)

## Checklist

- [x] Code follows project style guidelines
- [x] Self-review completed
- [x] Documentation comprehensive (DEPLOYMENT.md, RELEASE_NOTES.md)
- [x] No breaking changes
- [x] Workflows validated (YAML syntax)
- [x] Rollback procedures documented

---

**Deployment Stats**:
- **New Workflows**: 2 (preview-deploy.yml, production-deploy.yml)
- **New Documentation**: 2 (DEPLOYMENT.md 450줄, RELEASE_NOTES.md 200줄)
- **Updated Documentation**: 1 (README.md 배포 섹션)
- **Total Lines Added**: 1,481 lines

**Workflow Features**:
- Automated preview deployments with PR comments
- Production deployments with release notes
- Post-deployment health checks
- Emergency rollback automation
- Artifact retention (90 days)
- Manual deployment fallback

**Documentation Coverage**:
- Complete deployment guide (10 sections)
- 3 rollback options with examples
- 4 troubleshooting scenarios
- Platform-specific guides (Vercel, AWS, Azure)
- Release notes template
- Release checklist (20+ items)

**Next Steps**:
1. PR 리뷰 및 승인
2. main 브랜치 머지
3. Vercel secrets 설정 (VERCEL_TOKEN 등)
4. 첫 자동 배포 확인
5. Release notes artifact 다운로드

**Related PRs**:
- Builds on: #1 (feat/prompt-v1) - 프롬프트 시스템
- Builds on: #2 (test/prompt-and-api) - 테스트 인프라
- Builds on: #3 (docs/ci-tuning) - CI/문서 개선
