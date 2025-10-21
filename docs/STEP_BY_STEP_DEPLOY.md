# 화면 보면서 따라하는 배포 가이드

GitHub부터 Vercel 배포까지 하나씩 따라하시면 됩니다.

---

## 📱 1단계: GitHub 계정 확인

### 1-1. GitHub 접속
```
https://github.com
```

- **계정 있음**: 로그인하세요
- **계정 없음**: 우측 상단 "Sign up" 클릭 → 이메일로 가입 (무료)

### 1-2. 로그인 확인
- 로그인하면 우측 상단에 프로필 사진이 보입니다
- 클릭하면 "Your repositories" 메뉴가 있어야 합니다

---

## 📦 2단계: GitHub에 새 Repository 만들기

### 2-1. New Repository 페이지 열기

**방법 A**: 직접 주소 입력
```
https://github.com/new
```

**방법 B**: 클릭으로 이동
1. GitHub 우측 상단 `+` 버튼 클릭
2. "New repository" 선택

### 2-2. Repository 정보 입력

화면에 다음 내용을 입력하세요:

**Repository name** (필수):
```
speech-generator-ocr
```

**Description** (선택):
```
PDF 기반 보험 화법 생성 시스템
```

**Public/Private** 선택:
- ✅ **Public**: 누구나 볼 수 있음 (무료, 권장)
- ⬜ **Private**: 나만 볼 수 있음 (무료, 하지만 Vercel 연동 시 추가 설정 필요)

**⚠️ 중요! 체크 해제해야 할 것들**:
- ❌ "Add a README file" ← 체크 해제 (이미 있음)
- ❌ "Add .gitignore" ← 체크 해제 (이미 있음)
- ❌ "Choose a license" ← None 선택

### 2-3. Repository 생성

**"Create repository"** 초록색 버튼 클릭!

---

## 💻 3단계: 로컬 코드를 GitHub에 올리기

Repository를 만들면 안내 화면이 나옵니다.

### 3-1. 안내 화면 확인

화면에 이런 내용이 보일 겁니다:
```
…or push an existing repository from the command line
```

그 아래 명령어들이 있습니다. **무시하세요!** 우리가 직접 입력할게요.

### 3-2. GitHub 사용자명 확인

화면 우측 상단에 있는 **프로필 사진** 클릭하면 사용자명이 보입니다.
예: `github.com/YOUR_USERNAME` ← 이 부분을 기억하세요!

### 3-3. 명령 프롬프트(터미널) 열기

**Windows**:
- 시작 메뉴
- "cmd" 또는 "명령 프롬프트" 검색
- 또는 `Windows + R` → `cmd` 입력

**또는 Git Bash 사용** (Git이 설치되어 있다면):
- 시작 메뉴
- "Git Bash" 검색

### 3-4. 프로젝트 폴더로 이동

```cmd
cd "C:\Users\Administrator\Desktop\화법 생성 OCR"
```

엔터 치면 프롬프트가 이렇게 바뀝니다:
```
C:\Users\Administrator\Desktop\화법 생성 OCR>
```

### 3-5. Git 원격 저장소 연결

**⚠️ 주의**: `YOUR_USERNAME`을 **실제 GitHub 사용자명**으로 바꾸세요!

```cmd
git remote add origin https://github.com/YOUR_USERNAME/speech-generator-ocr.git
```

예시:
```cmd
git remote add origin https://github.com/johndoe/speech-generator-ocr.git
```

엔터 치면 아무것도 안 나옵니다 (정상!)

### 3-6. main 브랜치로 변경 및 푸시

```cmd
git branch -M main
```

```cmd
git push -u origin main
```

### 3-7. GitHub 인증

**처음 푸시하면 인증 창이 뜹니다!**

**방법 A: 브라우저 인증 창** (최신 Git)
1. 브라우저가 자동으로 열림
2. "Authorize Git Credential Manager" 클릭
3. GitHub 비밀번호 입력
4. 완료!

**방법 B: Personal Access Token** (인증 창 안 뜨면)
1. GitHub에서 토큰 생성:
   ```
   https://github.com/settings/tokens/new
   ```
2. Note: `speech-ocr-deploy`
3. Expiration: `90 days` (또는 원하는 기간)
4. Select scopes: ✅ `repo` (전체 체크)
5. "Generate token" 클릭
6. 토큰 복사 (⚠️ 한 번만 표시됨!): `ghp_abc123...`
7. 명령 프롬프트로 돌아가서:
   ```cmd
   git push -u origin main
   ```
8. Username: `your-github-username`
9. Password: `ghp_abc123...` (복사한 토큰 붙여넣기)

### 3-8. 푸시 성공 확인

명령 프롬프트에 이런 메시지가 나옵니다:
```
Enumerating objects: 123, done.
Counting objects: 100% (123/123), done.
...
To https://github.com/YOUR_USERNAME/speech-generator-ocr.git
 * [new branch]      main -> main
```

---

## ✅ 4단계: GitHub에서 코드 확인

### 4-1. GitHub Repository 새로고침

브라우저에서:
```
https://github.com/YOUR_USERNAME/speech-generator-ocr
```

접속하면 파일들이 보여야 합니다:
```
📁 .github/
📁 apps/
📁 docs/
📁 packages/
📄 package.json
📄 README.md
...
```

**보이면 성공!** 🎉

---

## ☁️ 5단계: Vercel 계정 준비

### 5-1. Vercel 접속
```
https://vercel.com
```

### 5-2. 로그인/가입

**계정 있음**:
- "Login" 클릭
- GitHub 계정으로 로그인 (권장)

**계정 없음**:
1. "Sign Up" 클릭
2. "Continue with GitHub" 선택 (제일 쉬움)
3. GitHub 인증 승인
4. 이메일 확인
5. 완료!

### 5-3. Dashboard 확인

로그인하면 Dashboard가 보입니다:
```
https://vercel.com/dashboard
```

좌측에 메뉴, 중앙에 프로젝트 목록 (비어있을 수 있음)

---

## 🚀 6단계: Vercel에 프로젝트 Import

### 6-1. New Project 시작

**"Add New..."** 버튼 클릭 (우측 상단)
→ **"Project"** 선택

또는 직접 주소 입력:
```
https://vercel.com/new
```

### 6-2. GitHub 연결

**처음 사용하는 경우**:
1. "Continue with GitHub" 클릭
2. "Install Vercel" 승인
3. Repository 접근 권한 선택:
   - ✅ "All repositories" (간단함)
   - 또는 "Only select repositories" → `speech-generator-ocr` 선택
4. "Install" 클릭

**이미 연결되어 있는 경우**:
- Repository 목록이 바로 보입니다

### 6-3. Repository 선택

목록에서 **`speech-generator-ocr`** 찾기

**"Import"** 버튼 클릭

### 6-4. Project 설정 (⚠️ 중요!)

**Configure Project** 화면이 나옵니다.

#### Project Name (자동 입력됨)
```
speech-generator-ocr
```
그대로 두세요.

#### Framework Preset (자동 감지)
```
Next.js
```
자동으로 선택되어 있을 겁니다.

#### Root Directory (⚠️ 제일 중요!)

**기본값**: `./ (Root Directory)`

**⚠️ 반드시 변경해야 합니다!**

1. "Edit" 버튼 클릭
2. 입력창에 입력:
   ```
   apps/web
   ```
3. 완료!

왜냐하면 우리 프로젝트는 monorepo라서 실제 웹 앱은 `apps/web` 폴더에 있습니다.

#### Build and Output Settings (자동)

**Build Command**:
```
cd ../.. && pnpm install && pnpm -C apps/web build
```
또는 자동 감지되면 그대로 두세요.

**Output Directory**:
```
.next
```
기본값 그대로

**Install Command**:
```
pnpm install
```
또는 자동 감지

### 6-5. Environment Variables 추가 (필수!)

⚠️ **이게 없으면 배포되어도 작동 안 합니다!**

아래로 스크롤하면 **"Environment Variables"** 섹션이 있습니다.

**첫 번째 변수 추가**:
1. **Name** 입력:
   ```
   OPENAI_API_KEY
   ```
2. **Value** 입력:
   ```
   sk-proj-your-key-here
   ```
   (⚠️ 실제 OpenAI 키를 넣어야 합니다! 아래 7단계에서 발급)

   **지금 키가 없다면**: 임시로 `sk-temp` 입력하고 나중에 변경

3. **Environment** 선택:
   - ✅ Production
   - ✅ Preview
   - ⬜ Development (선택)

4. **"Add"** 버튼 클릭

**두 번째 변수 추가**:
1. **Name**: `DAILY_PAGE_LIMIT`
2. **Value**: `200`
3. **"Add"** 클릭

**세 번째 변수 추가**:
1. **Name**: `CONCURRENCY_HINT`
2. **Value**: `10`
3. **"Add"** 클릭

### 6-6. Deploy 실행!

모든 설정 완료 후:

**"Deploy"** 큰 파란색 버튼 클릭!

### 6-7. 배포 진행 확인

배포가 시작됩니다!

화면에 실시간 로그가 나옵니다:
```
▲ Vercel CLI 33.0.1
⠋ Installing dependencies...
⠋ Building...
...
```

**약 2-3분 소요됩니다.** ☕

### 6-8. 배포 완료!

성공하면:
```
✅ Production: Ready

🎉 Congratulations!
```

**"Visit"** 버튼이 나타납니다!

**배포 URL**:
```
https://speech-generator-ocr-YOUR_USERNAME.vercel.app
```

또는

```
https://speech-generator-ocr.vercel.app
```

---

## 🔑 7단계: OpenAI API 키 발급

### 7-1. OpenAI Platform 접속

```
https://platform.openai.com
```

### 7-2. 로그인/가입

**계정 있음**: 로그인

**계정 없음**:
1. "Sign up" 클릭
2. 이메일 또는 Google/Microsoft 계정으로 가입
3. 이메일 인증
4. 전화번호 인증 (SMS)

### 7-3. API Keys 페이지 이동

좌측 메뉴:
**"API keys"** 클릭

또는 직접 주소:
```
https://platform.openai.com/api-keys
```

### 7-4. 새 키 생성

**"+ Create new secret key"** 버튼 클릭

**팝업 창**:
1. **Name**: `speech-generator-production`
2. **Permissions**: "All" (기본값)
3. **"Create secret key"** 클릭

### 7-5. 키 복사

⚠️ **키가 한 번만 표시됩니다!**

```
sk-proj-abc123def456...
```

**"Copy"** 버튼 클릭하여 복사!

메모장이나 안전한 곳에 저장하세요.

**"Done"** 클릭

### 7-6. 요금 확인 (중요!)

**Billing 메뉴** 클릭:
```
https://platform.openai.com/settings/organization/billing/overview
```

**크레딧 확인**:
- 크레딧 있음: 바로 사용 가능
- 크레딧 없음: "Add payment method" → 카드 등록

**예상 비용**:
- gpt-4o-mini 사용 시
- 페이지당 ~$0.0005
- 월 200페이지 = **$0.10 (약 130원)**

매우 저렴합니다!

---

## ⚙️ 8단계: Vercel에 API 키 추가

### 8-1. Vercel Dashboard로 이동

```
https://vercel.com/dashboard
```

### 8-2. 프로젝트 선택

목록에서 **`speech-generator-ocr`** 클릭

### 8-3. Settings 이동

상단 탭에서:
**"Settings"** 클릭

### 8-4. Environment Variables 이동

좌측 메뉴에서:
**"Environment Variables"** 클릭

### 8-5. OPENAI_API_KEY 수정/추가

**이미 있는 경우** (6단계에서 임시로 추가했다면):
1. `OPENAI_API_KEY` 행 찾기
2. 우측 점 3개(⋯) 클릭
3. "Edit" 선택
4. **Value** 입력:
   ```
   sk-proj-abc123def456...
   ```
   (7단계에서 복사한 실제 키)
5. **"Save"** 클릭

**없는 경우**:
1. **"Add New"** 버튼 클릭
2. **Name**: `OPENAI_API_KEY`
3. **Value**: `sk-proj-abc123def456...`
4. **Environment**:
   - ✅ Production
   - ✅ Preview
5. **"Save"** 클릭

### 8-6. 재배포

API 키를 추가/수정했으면 **반드시 재배포**해야 합니다!

1. 상단 탭에서 **"Deployments"** 클릭
2. 맨 위 최신 배포 찾기
3. 우측 점 3개(⋯) 클릭
4. **"Redeploy"** 선택
5. 팝업에서 **"Redeploy"** 버튼 클릭

1-2분 대기...

완료!

---

## 📝 9단계: 프롬프트 파일 수정

### 9-1. 프롬프트 파일 열기

**파일 탐색기**로:
```
C:\Users\Administrator\Desktop\화법 생성 OCR\packages\core\src\prompt.ts
```

**메모장 또는 VS Code**로 열기

### 9-2. 현재 내용 확인

이렇게 되어 있을 겁니다:
```typescript
export const DEFAULT_STYLE_PROMPT = "{{STYLE_PROMPT}}";
```

### 9-3. 실제 프롬프트로 교체

**교체 예시 (보험 설계사용)**:

```typescript
export const DEFAULT_STYLE_PROMPT = `
당신은 보험 설계사를 위한 전문 화법 스크립트 작성자입니다.

## 목표
- 고객이 쉽게 이해할 수 있는 친근한 설명
- 핵심 보장 내용을 명확히 전달
- 가입 결정을 돕는 설득력 있는 표현

## 작성 원칙
1. 전문 용어는 쉬운 말로 풀어서 설명
2. 구체적인 예시와 상황 제시
3. 고객의 관심사와 연결 (가족, 건강, 재정)
4. 긍정적이고 신뢰감 있는 톤 유지
5. 문단 구분과 강조 포인트 명확히

## 금지 사항
- 과장되거나 확정적이지 않은 표현
- 다른 상품 비하
- 복잡한 보험 용어 남발
- 압박 판매 느낌의 표현

## 출력 형식
- Markdown 형식 사용
- 중요 포인트는 **볼드** 처리
- 리스트나 번호 매기기 활용
- 고객 질문 예상 및 답변 포함
`;
```

**더 많은 예시**:
```
C:\Users\Administrator\Desktop\화법 생성 OCR\packages\core\src\prompt-examples.md
```
파일 참고!

### 9-4. 파일 저장

**Ctrl + S** 또는 "파일 → 저장"

---

## 🚢 10단계: 변경사항 배포

### 10-1. 명령 프롬프트 열기

### 10-2. 프로젝트 폴더로 이동

```cmd
cd "C:\Users\Administrator\Desktop\화법 생성 OCR"
```

### 10-3. 변경사항 커밋

```cmd
git add packages/core/src/prompt.ts
```

```cmd
git commit -m "feat: add custom insurance prompt"
```

### 10-4. GitHub에 푸시

```cmd
git push origin main
```

### 10-5. 자동 배포 대기

푸시하면 **Vercel이 자동으로 감지**하고 재배포합니다!

**확인 방법**:
1. Vercel Dashboard → 프로젝트 선택
2. "Deployments" 탭
3. 새 배포가 진행 중인 것 확인
4. 1-2분 대기
5. "Ready" 상태 확인

---

## 🎉 11단계: 배포 확인 및 테스트

### 11-1. 배포 URL 접속

브라우저에서:
```
https://speech-generator-ocr-YOUR_USERNAME.vercel.app
```

또는 Vercel Dashboard에서 **"Visit"** 버튼 클릭

### 11-2. 화면 확인

다음이 보여야 합니다:
```
화법 생성 OCR (텍스트 PDF)

[ 주제 입력 창 ]
[ PDF 파일 업로드 ]
[ 길이: 짧게/중간/길게 ]
[ 톤: 기본/설득형/설명형/요점형 ]
```

### 11-3. 기능 테스트

**테스트 시나리오**:

1. **주제 입력**:
   ```
   건강보험 상품 소개
   ```

2. **PDF 업로드**:
   - 텍스트 PDF 파일 준비 (보험 약관 등)
   - "PDF 파일" 버튼 클릭
   - 파일 선택

3. **옵션 선택**:
   - 길이: "중간 (250~400)"
   - 톤: "설득형"

4. **생성 실행**:
   - "전체 페이지 생성" 버튼 클릭
   - 로딩... 대기 (10-30초)

5. **결과 확인**:
   - 생성된 화법 스크립트 표시
   - 상단 배지에 토큰/비용 표시
   - "결과 Markdown 다운로드" 가능

### 11-4. 문제 해결

**"Missing OPENAI_API_KEY" 에러**:
- 8단계 다시 확인
- Redeploy 했는지 확인

**빌드 실패**:
- Vercel → Deployments → 실패한 배포 클릭
- 로그 확인
- Root Directory가 `apps/web`인지 확인

**화법 생성 안됨**:
- OpenAI 계정 크레딧 확인
- API 키 유효성 확인
- Browser Console (F12) 에러 확인

---

## ✅ 완료 체크리스트

전부 완료하셨나요?

- [ ] GitHub에 코드 푸시 완료
- [ ] Vercel에서 Import 완료
- [ ] Root Directory `apps/web` 설정
- [ ] OpenAI API 키 발급
- [ ] Vercel에 API 키 추가
- [ ] 프롬프트 파일 수정
- [ ] 재배포 완료
- [ ] 배포 URL 접속 확인
- [ ] PDF 업로드 테스트
- [ ] 화법 생성 테스트

---

## 🎯 배포 URL

**최종 배포 주소**:
```
https://speech-generator-ocr-YOUR_USERNAME.vercel.app
```

이 주소를:
- ✅ 북마크에 저장
- ✅ 팀원들과 공유
- ✅ 모바일에서도 접속 가능

---

## 🔄 다음부터는 간단합니다!

프롬프트나 코드 수정 후:

```cmd
# 1. 변경 파일 확인
git status

# 2. 커밋
git add .
git commit -m "fix: update something"

# 3. 푸시 (자동 배포!)
git push origin main
```

1-2분 후 자동으로 배포 완료!

---

## 📞 문제 발생 시

### GitHub 푸시 안됨
```
Authentication failed
```
→ 3-7단계 인증 다시 확인

### Vercel 빌드 실패
```
Error: Cannot find module
```
→ Root Directory 확인 (`apps/web`)

### API 키 에러
```
Missing OPENAI_API_KEY
```
→ 8단계 확인 + Redeploy

---

## 🎓 추가 자료

- **프롬프트 예시**: `packages/core/src/prompt-examples.md`
- **상세 배포 가이드**: `docs/QUICK_DEPLOY.md`
- **Vercel 문서**: https://vercel.com/docs

---

**배포 성공하셨나요?** 🎉

이제 실제로 사용해보시고, 프롬프트를 계속 개선하시면 됩니다!
