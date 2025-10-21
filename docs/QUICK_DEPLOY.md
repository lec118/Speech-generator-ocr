# 빠른 배포 가이드

이 가이드는 로컬 환경에서 실제 배포까지의 전체 과정을 안내합니다.

## 📋 사전 준비

### 1. 필수 계정
- [ ] GitHub 계정
- [ ] Vercel 계정 (https://vercel.com/signup)
- [ ] OpenAI 계정 (https://platform.openai.com/signup)

### 2. 필수 도구
- [ ] Git 설치됨
- [ ] Node.js 18+ 설치됨
- [ ] pnpm 설치: `npm install -g pnpm`

---

## 🔑 1단계: API 키 발급

### OpenAI API 키 발급

1. **OpenAI Platform 접속**
   ```
   https://platform.openai.com/api-keys
   ```

2. **새 API 키 생성**
   - "Create new secret key" 클릭
   - 이름: `speech-generator-production`
   - 키 복사 (한 번만 표시됨!): `sk-proj-...`

3. **요금제 확인**
   ```
   https://platform.openai.com/settings/organization/billing/overview
   ```
   - 크레딧이 있거나 결제 수단 등록 필요
   - gpt-4o-mini 사용 시 매우 저렴 (~$0.01/1000 요청)

---

## 📦 2단계: GitHub에 코드 올리기

### 새 Repository 생성

1. **GitHub에서 새 repo 생성**
   ```
   https://github.com/new
   ```
   - Repository name: `speech-generator-ocr`
   - Visibility: Public 또는 Private
   - ❌ Initialize with README 체크 해제 (이미 있음)

2. **로컬에서 원격 연결**
   ```bash
   # 현재 위치 확인
   cd "C:\Users\Administrator\Desktop\화법 생성 OCR"

   # 원격 저장소 연결 (YOUR_USERNAME을 실제 GitHub 사용자명으로 변경)
   git remote add origin https://github.com/YOUR_USERNAME/speech-generator-ocr.git

   # main 브랜치로 푸시
   git branch -M main
   git push -u origin main

   # 모든 브랜치 푸시
   git push origin --all
   ```

3. **푸시 성공 확인**
   ```
   https://github.com/YOUR_USERNAME/speech-generator-ocr
   ```

---

## ☁️ 3단계: Vercel 배포

### Vercel 프로젝트 생성

1. **Vercel 대시보드 접속**
   ```
   https://vercel.com/dashboard
   ```

2. **New Project 클릭**

3. **GitHub 연결**
   - "Import Git Repository" 선택
   - GitHub 연결 승인
   - `speech-generator-ocr` repository 선택

4. **프로젝트 설정**
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/web`
   - **Build Command**: `cd ../.. && pnpm install && pnpm -C apps/web build`
   - **Install Command**: `pnpm install`

5. **환경 변수 설정** (중요!)

   **Production 환경**:
   ```
   OPENAI_API_KEY=sk-proj-YOUR-KEY-HERE
   DAILY_PAGE_LIMIT=200
   CONCURRENCY_HINT=10
   ```

   **Preview 환경** (선택):
   ```
   OPENAI_API_KEY=sk-proj-YOUR-PREVIEW-KEY
   DAILY_PAGE_LIMIT=50
   CONCURRENCY_HINT=5
   ```

6. **Deploy 클릭**

### 배포 URL 확인

배포 완료 후 Vercel이 자동으로 URL을 생성합니다:

**Production URL**:
```
https://speech-generator-ocr.vercel.app
또는
https://your-project-name-username.vercel.app
```

**커스텀 도메인 설정 (선택)**:
```
Settings → Domains → Add Domain
```

---

## 🔐 4단계: GitHub Secrets 설정 (자동 배포용)

자동 배포를 위해 GitHub Secrets를 추가합니다.

### Vercel 토큰 발급

1. **Vercel Token 생성**
   ```
   https://vercel.com/account/tokens
   ```
   - "Create Token" 클릭
   - Name: `github-actions`
   - Scope: Full Account
   - 토큰 복사: `vJxxx...`

2. **Vercel 프로젝트 정보 확인**
   ```
   Settings → General
   ```
   - **Project ID**: `prj_xxx...`
   - **Org ID** (Team): `team_xxx...`

### GitHub Secrets 추가

1. **GitHub Repository 설정 접속**
   ```
   https://github.com/YOUR_USERNAME/speech-generator-ocr/settings/secrets/actions
   ```

2. **New repository secret 클릭하여 추가**:

   | Secret Name | Value | 설명 |
   |-------------|-------|------|
   | `VERCEL_TOKEN` | `vJxxx...` | Vercel 토큰 |
   | `VERCEL_ORG_ID` | `team_xxx...` | Vercel 조직 ID |
   | `VERCEL_PROJECT_ID` | `prj_xxx...` | Vercel 프로젝트 ID |
   | `OPENAI_API_KEY` | `sk-proj-...` | OpenAI API 키 (Production) |
   | `OPENAI_API_KEY_PREVIEW` | `sk-proj-...` | OpenAI API 키 (Preview, 선택) |

---

## ✅ 5단계: 배포 확인

### 수동 배포 확인

1. **Vercel Dashboard 접속**
   ```
   https://vercel.com/dashboard
   ```

2. **프로젝트 선택** → "Visit" 버튼 클릭

3. **배포 URL 접속**
   ```
   https://your-project.vercel.app
   ```

4. **기능 테스트**
   - [ ] 페이지 로드 확인
   - [ ] PDF 업로드 기능
   - [ ] 길이/톤 옵션 표시
   - [ ] "전체 페이지 생성" 버튼 (PDF 업로드 후)

### 자동 배포 테스트

1. **새 브랜치 생성 및 변경**
   ```bash
   git checkout -b test/auto-deploy

   # 간단한 변경
   echo "# Test" >> README.md
   git add README.md
   git commit -m "test: auto deployment"
   git push origin test/auto-deploy
   ```

2. **GitHub에서 PR 생성**
   ```
   https://github.com/YOUR_USERNAME/speech-generator-ocr/compare/main...test/auto-deploy
   ```
   - "Create pull request" 클릭

3. **Preview 배포 확인**
   - Actions 탭에서 "Preview Deployment" workflow 실행 확인
   - PR 코멘트에 preview URL 표시 확인

4. **PR 머지**
   - "Merge pull request" 클릭
   - "Confirm merge" 클릭

5. **Production 배포 확인**
   - Actions 탭에서 "Production Deployment" workflow 실행
   - Release notes artifact 다운로드 가능

---

## 🧪 6단계: 실제 사용 테스트

### PDF 업로드 및 화법 생성

1. **배포된 URL 접속**
   ```
   https://your-project.vercel.app
   ```

2. **테스트 PDF 준비**
   - 텍스트가 포함된 PDF 파일 (스캔본 X)
   - 건강보험 약관 또는 상품 설명서 PDF 권장

3. **화법 생성 테스트**
   ```
   1. 주제 입력: "건강보험 상품 소개"
   2. PDF 업로드
   3. 길이 선택: "중간 (250~400)"
   4. 톤 선택: "설득형"
   5. "전체 페이지 생성" 클릭
   6. 결과 확인 및 다운로드
   ```

4. **비용 확인**
   - 상단 배지에서 토큰 수 확인
   - 예상 비용 표시 확인

---

## 🎯 화법 생성 프롬프트 커스터마이징

### 기본 프롬프트 위치

현재 코드에는 `{{STYLE_PROMPT}}`라는 플레이스홀더가 있습니다.

**파일**: `packages/core/src/prompt.ts`
```typescript
export const DEFAULT_STYLE_PROMPT = "{{STYLE_PROMPT}}";
```

### 프롬프트 교체 방법

**Option 1: 파일 직접 수정** (권장)

1. **로컬에서 수정**
   ```typescript
   // packages/core/src/prompt.ts
   export const DEFAULT_STYLE_PROMPT = `
   당신은 보험 설계사를 위한 전문 화법 스크립트 작성자입니다.

   목표:
   - 고객이 쉽게 이해할 수 있는 친근한 설명
   - 핵심 보장 내용을 명확히 전달
   - 가입 결정을 돕는 설득력 있는 표현

   작성 원칙:
   1. 전문 용어는 쉬운 말로 풀어서 설명
   2. 구체적인 예시와 상황 제시
   3. 고객의 관심사와 연결
   4. 긍정적이고 신뢰감 있는 톤 유지

   금지 사항:
   - 과장되거나 확정적이지 않은 표현
   - 다른 상품 비하
   - 복잡한 보험 용어 남발
   `;
   ```

2. **커밋 및 푸시**
   ```bash
   git add packages/core/src/prompt.ts
   git commit -m "feat: customize style prompt for insurance agents"
   git push origin main
   ```

3. **자동 배포 대기** (GitHub Actions)

**Option 2: 환경 변수로 관리** (고급)

프롬프트를 환경 변수로 관리하려면:

1. **코드 수정**
   ```typescript
   // packages/core/src/prompt.ts
   export const DEFAULT_STYLE_PROMPT =
     process.env.CUSTOM_STYLE_PROMPT || "{{STYLE_PROMPT}}";
   ```

2. **Vercel 환경 변수 추가**
   ```
   Settings → Environment Variables

   Name: CUSTOM_STYLE_PROMPT
   Value: [프롬프트 전문]
   ```

3. **Redeploy** 버튼 클릭

---

## 💰 비용 예상

### OpenAI API 비용

**gpt-4o-mini 가격** (2025년 기준):
- Input: $0.00015 / 1K tokens
- Output: $0.0006 / 1K tokens

**예상 사용량** (페이지당):
- Input: ~2,000 tokens (원문 + 프롬프트)
- Output: ~400 tokens (생성된 화법)
- **페이지당 비용**: ~$0.00054

**월 사용 예상** (200페이지):
- 총 비용: 200 × $0.00054 = **$0.108/월**
- 한화: 약 **140원/월**

### Vercel 비용

- **Hobby Plan**: 무료
  - 100 GB-hours/월
  - Unlimited deployments
  - 대부분의 소규모 프로젝트에 충분

- **Pro Plan**: $20/월 (필요 시)
  - 1000 GB-hours/월
  - Custom domains
  - Analytics

---

## 🔍 배포 후 확인 사항

### Health Check

**수동 확인**:
1. 메인 페이지 로드: `https://your-app.vercel.app`
2. PDF 업로드 UI 표시
3. 옵션 셀렉터 동작
4. Console 에러 없음 (F12)

**API 엔드포인트 확인**:
```bash
# OpenAI 키 설정 확인 (에러가 아닌지만 확인)
curl https://your-app.vercel.app/api/generate \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"pages":[]}'
```

### 모니터링 설정 (선택)

**Vercel Analytics**:
```
Settings → Analytics → Enable
```

**Sentry (에러 트래킹)**:
```bash
pnpm add @sentry/nextjs
```

---

## 🚨 문제 해결

### 배포 실패

**증상**: Vercel 배포가 실패함

**확인 사항**:
1. Build Command 확인: `cd ../.. && pnpm install && pnpm -C apps/web build`
2. Root Directory: `apps/web`
3. 환경 변수 설정 확인

### API 키 에러

**증상**: "Missing OPENAI_API_KEY" 에러

**해결**:
1. Vercel → Settings → Environment Variables
2. `OPENAI_API_KEY` 추가
3. Redeploy

### 화법 생성 안됨

**증상**: "생성 중..." 멈춤

**확인**:
1. OpenAI API 키 유효성
2. OpenAI 계정 크레딧 확인
3. Browser Console (F12) 에러 확인
4. Vercel Logs 확인

---

## 📞 추가 지원

### 문서
- [Vercel 배포 가이드](https://vercel.com/docs)
- [Next.js 문서](https://nextjs.org/docs)
- [OpenAI API 문서](https://platform.openai.com/docs)

### 로그 확인
```bash
# Vercel CLI 설치
npm i -g vercel

# 로그 확인
vercel logs <deployment-url>
```

---

## ✅ 체크리스트

배포 전:
- [ ] OpenAI API 키 발급 완료
- [ ] GitHub repository 생성 완료
- [ ] 코드 푸시 완료
- [ ] Vercel 계정 생성 완료

배포 중:
- [ ] Vercel 프로젝트 생성
- [ ] 환경 변수 설정 (OPENAI_API_KEY)
- [ ] 첫 배포 성공

배포 후:
- [ ] 배포 URL 접속 확인
- [ ] PDF 업로드 테스트
- [ ] 화법 생성 테스트
- [ ] 비용 모니터링 설정

자동 배포 (선택):
- [ ] GitHub Secrets 설정
- [ ] Preview 배포 테스트
- [ ] Production 배포 테스트

---

**배포 완료 후 최종 URL**:
```
https://your-project-name.vercel.app
```

이 URL을 팀원들과 공유하여 사용할 수 있습니다!
