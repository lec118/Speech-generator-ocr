# Release Notes

이 문서는 프로덕션 배포 시 자동으로 생성되는 릴리스 노트의 템플릿입니다.

## 자동 생성 정보

프로덕션 배포 워크플로우(`production-deploy.yml`)는 다음 정보를 자동으로 수집합니다:

- **변경 사항**: 마지막 머지 커밋 메시지
- **변경된 파일 목록**: 최근 20개 파일
- **배포 정보**: SHA, 배포자, 타임스탬프
- **롤백 지침**: 자동 생성된 롤백 명령어

## 릴리스 노트 형식

```markdown
# Release Notes - YYYY-MM-DD

## Changes in this deployment

### Commit
```
[마지막 머지 커밋 메시지]
```

### Changed Files
```
[변경된 파일 목록]
```

### Deployment Info
- **Commit SHA**: [커밋 해시]
- **Triggered by**: [배포자]
- **Reason**: [배포 사유]
- **Timestamp**: [UTC 타임스탬프]

## Rollback Instructions

If issues occur, rollback using:

```bash
# Option 1: Revert merge commit
git revert -m 1 <merge_commit>
git push origin main

# Option 2: Vercel rollback
vercel rollback --token=$VERCEL_TOKEN

# Option 3: Manual previous deployment
# Go to Vercel Dashboard → Deployments → Select previous → Promote to Production
```

## Risks
- API changes may affect existing integrations
- Environment variable changes require Vercel re-deployment
- Database schema changes (if any) require migration

---
🤖 Generated automatically by GitHub Actions
```

## 수동 릴리스 노트 작성 가이드

자동 생성 외에 중요한 릴리스는 수동으로 작성할 수 있습니다.

### 템플릿

```markdown
# Release v1.0.0 - YYYY-MM-DD

## 📋 Summary
[릴리스 요약 - 1~2문장]

## ✨ New Features
- [기능 1]: [설명]
- [기능 2]: [설명]

## 🐛 Bug Fixes
- [수정 1]: [설명]
- [수정 2]: [설명]

## 🔧 Improvements
- [개선 1]: [설명]
- [개선 2]: [설명]

## ⚠️ Breaking Changes
- [변경 사항]: [영향 및 마이그레이션 가이드]

## 📚 Documentation
- [문서 업데이트 1]
- [문서 업데이트 2]

## 🔐 Security
- [보안 업데이트 1]
- [보안 업데이트 2]

## 🚀 Deployment

### Environment Variables
- `NEW_VAR`: [설명]
- `UPDATED_VAR`: [변경 사항]

### Migration Steps
1. [단계 1]
2. [단계 2]

### Rollback Plan
```bash
# Immediate rollback
git revert -m 1 <merge_commit>
git push origin main

# Vercel rollback
vercel rollback --token=$VERCEL_TOKEN
```

## ⚙️ Technical Details

### Performance
- [성능 개선 사항]

### Dependencies
- Updated: [패키지명] v1.0.0 → v2.0.0
- Added: [새 패키지명] v1.0.0
- Removed: [제거된 패키지명]

### Database
- [스키마 변경 사항]
- [인덱스 추가/제거]

## 🧪 Testing

### Test Coverage
- Unit tests: XX%
- E2E tests: XX scenarios

### Manual Testing Checklist
- [ ] PDF 업로드 기능
- [ ] 길이/톤 옵션 선택
- [ ] 화법 생성 (개별/일괄)
- [ ] 결과 다운로드
- [ ] 토큰/비용 표시
- [ ] 에러 처리 (429, 500)

## 📊 Metrics

### Before Deployment
- Response time: XXms (p95)
- Error rate: X.XX%
- Deployment frequency: X/week

### After Deployment (Target)
- Response time: XXms (p95)
- Error rate: X.XX%
- Deployment frequency: X/week

## 🔗 Links
- [PR #123](https://github.com/org/repo/pull/123)
- [Issue #456](https://github.com/org/repo/issues/456)
- [Deployment](https://app.vercel.com/deployment/xyz)

## 👥 Contributors
- @username1
- @username2

---
Released by: [Your Name]
Date: YYYY-MM-DD HH:MM UTC
```

## 릴리스 체크리스트

배포 전 확인 사항:

### 코드 품질
- [ ] 모든 테스트 통과 (CI 녹색)
- [ ] 코드 리뷰 완료
- [ ] Breaking changes 문서화
- [ ] CHANGELOG.md 업데이트

### 환경 설정
- [ ] 환경 변수 설정 확인
- [ ] Secrets 업데이트 (필요시)
- [ ] 인프라 용량 확인

### 모니터링
- [ ] 에러 트래킹 설정 (Sentry 등)
- [ ] 로그 모니터링 준비
- [ ] 알림 설정 확인

### 배포 후
- [ ] Health check 통과
- [ ] 주요 기능 수동 테스트
- [ ] 성능 메트릭 모니터링
- [ ] 에러 로그 확인

### 롤백 준비
- [ ] 이전 버전 배포 URL 확인
- [ ] 롤백 명령어 준비
- [ ] 팀 알림 채널 확인

## 과거 릴리스 노트

배포 완료 후, GitHub Actions artifact에서 릴리스 노트를 다운로드하여 이 섹션에 추가합니다.

### 릴리스 아카이브

- [2025-10-21 - Initial POC Release](#) - 첫 배포 (feat/prompt-v1, test/prompt-and-api)
- [다음 릴리스 날짜](#) - [요약]

---

**Note**: 프로덕션 배포 시 GitHub Actions workflow가 자동으로 릴리스 노트를 생성하고 artifact로 업로드합니다. artifact는 90일간 보관되며, 중요한 릴리스는 이 문서에 수동으로 추가하여 영구 보관합니다.
