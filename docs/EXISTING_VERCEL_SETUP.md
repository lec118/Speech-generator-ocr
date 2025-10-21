# 기존 Vercel 계정으로 자동 배포 설정하기

이미 Vercel 경험이 있으시다면, 훨씬 간단하게 자동 배포를 설정할 수 있습니다!

## 🚀 빠른 설정 (3단계, 5분)

### 1단계: GitHub에 코드 올리기

```bash
# 현재 디렉토리 확인
cd "C:\Users\Administrator\Desktop\화법 생성 OCR"

# GitHub에서 새 repository 생성 (웹 브라우저에서)
# https://github.com/new
# Repository name: speech-generator-ocr

# 원격 저장소 연결 (YOUR_USERNAME을 실제 GitHub 사용자명으로 변경)
git remote add origin https://github.com/YOUR_USERNAME/speech-generator-ocr.git

# main 브랜치로 푸시
git branch -M main
git push -u origin main
```

만약 GitHub 인증이 필요하면:
```bash
# Personal Access Token 사용
# Settings → Developer settings → Personal access tokens → Generate new token
# repo 권한 체크

# 또는 GitHub CLI 사용
gh auth login
git push -u origin main
```

### 2단계: Vercel에서 Import

1. **Vercel Dashboard 접속**
   ```
   https://vercel.com/dashboard
   ```

2. **"Add New..." → Project** 클릭

3. **Import Git Repository**
   - GitHub 연결되어 있으면 자동으로 repository 목록 표시
   - `speech-generator-ocr` 선택
   - "Import" 클릭

4. **Configure Project** (중요!)

   **Framework Preset**: Next.js (자동 감지됨)

   **Root Directory**:
   ```
   apps/web
   ```
   (⚠️ 이게 가장 중요! monorepo라서 apps/web을 지정해야 함)

   **Build and Output Settings**:
   - Build Command: 자동으로 감지됨 (또는 수동 입력)
     ```
     cd ../.. && pnpm install && pnpm -C apps/web build
     ```
   - Output Directory: `.next` (기본값)
   - Install Command: `pnpm install`

5. **Environment Variables** (필수!)

   "Add" 클릭하여 추가:
   ```
   Name: OPENAI_API_KEY
   Value: sk-proj-YOUR-ACTUAL-KEY-HERE

   Name: DAILY_PAGE_LIMIT
   Value: 200

   Name: CONCURRENCY_HINT
   Value: 10
   ```

6. **Deploy** 클릭!

### 3단계: 배포 완료 및 URL 확인

1. 배포 진행 상황 실시간 확인
2. 완료되면 자동으로 URL 생성:
   ```
   ✅ Production: https://speech-generator-ocr.vercel.app
   ✅ 또는: https://speech-generator-ocr-your-username.vercel.app
   ```

3. "Visit" 버튼 클릭하여 앱 확인!

---

## ✨ 자동 배포 동작 방식

### 이제부터 자동으로:

**Preview 배포** (PR 생성 시):
```
1. 새 브랜치 생성 및 변경
   ↓
2. GitHub에 PR 생성
   ↓
3. Vercel이 자동으로 Preview 배포
   ↓
4. PR 코멘트에 Preview URL 추가 (우리가 만든 workflow)
```

**Production 배포** (main에 머지 시):
```
1. PR을 main에 머지
   ↓
2. Vercel이 자동으로 Production 배포
   ↓
3. https://your-app.vercel.app 업데이트됨
```

---

## 🧪 테스트해보기

### 자동 배포 테스트

```bash
# 1. 테스트용 브랜치 생성
git checkout -b test/auto-deploy

# 2. 간단한 변경 (README 수정)
echo "# 자동 배포 테스트" >> README.md
git add README.md
git commit -m "test: verify auto deployment"

# 3. GitHub에 푸시
git push origin test/auto-deploy

# 4. GitHub에서 PR 생성
# https://github.com/YOUR_USERNAME/speech-generator-ocr/compare/main...test/auto-deploy
```

그러면:
- ✅ Vercel이 자동으로 Preview 배포
- ✅ GitHub PR에 "🚀 Preview Deployment" 코멘트 추가 (우리 workflow)
- ✅ Preview URL 제공

---

## 🔧 프롬프트 업데이트 및 재배포

### 방법 1: 코드 수정 후 푸시

```bash
# 1. 프롬프트 파일 수정
# packages/core/src/prompt.ts 에서
# DEFAULT_STYLE_PROMPT = "{{STYLE_PROMPT}}"
# → 실제 프롬프트로 교체

# 2. 커밋
git add packages/core/src/prompt.ts
git commit -m "feat: add insurance agent style prompt"

# 3. 푸시 (자동 배포!)
git push origin main
```

5분 후 자동으로 배포 완료!

### 방법 2: Vercel Dashboard에서 환경 변수 변경

프롬프트를 환경 변수로 관리하고 싶다면:

```bash
# 1. 코드 수정
# packages/core/src/prompt.ts
export const DEFAULT_STYLE_PROMPT =
  process.env.NEXT_PUBLIC_STYLE_PROMPT || "기본 프롬프트";

# 2. Vercel Dashboard → Settings → Environment Variables
Name: NEXT_PUBLIC_STYLE_PROMPT
Value: [프롬프트 전문 붙여넣기]

# 3. Redeploy 버튼 클릭
```

---

## 🎯 OpenAI API 키 설정 (필수!)

### 키 발급

1. **OpenAI Platform 접속**
   ```
   https://platform.openai.com/api-keys
   ```

2. **로그인 후 "Create new secret key" 클릭**
   - Name: `speech-generator-production`
   - Permissions: All (또는 필요한 것만)

3. **키 복사** (⚠️ 한 번만 표시됨!)
   ```
   sk-proj-abc123def456...
   ```

### Vercel에 설정

1. **Vercel Dashboard → 프로젝트 선택**

2. **Settings → Environment Variables**

3. **"Add" 클릭**
   ```
   Name: OPENAI_API_KEY
   Value: sk-proj-abc123def456...
   Environment: Production, Preview
   ```

4. **Save**

5. **Deployments → 최신 배포 → "Redeploy" 버튼 클릭**

이제 API 키가 적용되어 실제로 화법 생성이 동작합니다!

---

## 📊 배포 상태 확인

### Vercel Dashboard

```
https://vercel.com/dashboard
→ 프로젝트 선택
→ Deployments 탭
```

- ✅ Production: main 브랜치 배포
- 🔵 Preview: PR 브랜치 배포
- ⏸️ Queued: 대기 중
- ❌ Failed: 실패 (로그 확인)

### GitHub Actions

```
https://github.com/YOUR_USERNAME/speech-generator-ocr/actions
```

- ✅ CI: 린트/테스트
- ✅ Preview Deployment: PR 코멘트
- ✅ Production Deployment: Release notes 생성

---

## 💡 팁

### 빠른 수정 및 배포

로컬에서 테스트 없이 바로 배포하고 싶다면:

```bash
# 수정
vim packages/core/src/prompt.ts

# 커밋 & 푸시 (한 번에)
git add . && git commit -m "fix: update prompt" && git push
```

1분 후 자동 배포 완료!

### 배포 전 로컬 테스트

안전하게 배포하고 싶다면:

```bash
# 1. .env.local 파일 생성
echo "OPENAI_API_KEY=sk-proj-your-key" > apps/web/.env.local

# 2. 로컬 실행
pnpm install
pnpm -C apps/web dev

# 3. http://localhost:3000 에서 테스트

# 4. 문제없으면 푸시
git push
```

### 롤백 (문제 발생 시)

```bash
# Vercel Dashboard → Deployments
# → 이전 버전 선택
# → "Promote to Production" 클릭
```

또는:

```bash
git revert HEAD
git push origin main
```

---

## 🚨 문제 해결

### "Build failed" 에러

**원인**: Root Directory 설정 오류

**해결**:
```
Settings → General → Root Directory
→ apps/web 입력
→ Save
→ Redeploy
```

### "Missing OPENAI_API_KEY" 에러

**원인**: 환경 변수 미설정

**해결**:
```
Settings → Environment Variables
→ OPENAI_API_KEY 추가
→ Redeploy
```

### 프롬프트 변경이 반영 안됨

**원인**: 빌드 캐시

**해결**:
```
Deployments → 최신 배포
→ 점 3개(⋯) 클릭
→ "Redeploy"
→ ✅ "Use existing Build Cache" 체크 해제
→ Redeploy
```

---

## ✅ 체크리스트

### 초기 설정 (한 번만)
- [ ] GitHub에 코드 푸시 완료
- [ ] Vercel에서 프로젝트 Import 완료
- [ ] Root Directory를 `apps/web`로 설정
- [ ] OpenAI API 키 환경 변수 추가
- [ ] 첫 배포 성공

### 매번 수정 시
- [ ] 로컬에서 테스트 (선택)
- [ ] Git commit & push
- [ ] Vercel 자동 배포 대기 (~1-2분)
- [ ] 배포 URL에서 확인

---

## 🎉 완료!

이제 코드를 수정하고 푸시하기만 하면:
1. ✅ Vercel이 자동으로 배포
2. ✅ 1-2분 후 live 업데이트
3. ✅ URL 변경 없음 (항상 같은 주소)

**배포 URL**:
```
https://your-project-name.vercel.app
```

이 URL을 북마크하고 팀원들과 공유하세요!

---

## 다음 단계

1. **프롬프트 커스터마이징**
   - `packages/core/src/prompt.ts` 수정
   - [prompt-examples.md](../packages/core/src/prompt-examples.md) 참고

2. **실제 보험 PDF로 테스트**
   - 건강보험 약관 PDF 업로드
   - 생성 결과 확인 및 프롬프트 개선

3. **팀원 초대**
   - Vercel Dashboard → Settings → Team
   - 이메일로 초대

4. **커스텀 도메인 연결** (선택)
   - Settings → Domains
   - 본인 도메인 연결 가능
