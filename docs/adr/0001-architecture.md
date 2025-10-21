# ADR 0001: POC Architecture

- Status: Accepted
- Date: 2025-10-21

## Context
- 발표/화법 스크립트 생성을 빠르게 검증하기 위한 POC가 필요합니다.
- 다수의 실험을 병행하기 위해 애플리케이션과 핵심 로직, UI 패키지를 느슨하게 결합한 모노레포 구성이 요구됩니다.
- 클라우드 배포(Vercel)와 OpenAI API 연동을 가정합니다.

## Decision

### 모노레포 구조
- `turbo` + `pnpm`을 사용한 모노레포를 채택하고, 앱(`apps/web`)과 공용 패키지(`packages/core`, `packages/ui`)를 분리합니다.
- 스타일 및 프롬프트 변형이 잦은 도메인 특성상, 프롬프트 빌더(`packages/core`)와 UI 컴포넌트(`packages/ui`)를 별도 패키지로 두어 재사용성과 독립 배포 가능성을 열어둡니다.

### 처리 흐름
화법 생성 시스템은 다음과 같은 흐름을 따릅니다:

```
1. [클라이언트] PDF 업로드 (apps/web/app/page.tsx)
   ↓
2. [클라이언트] PDF.js로 페이지별 텍스트 추출
   ↓
3. [클라이언트] 사용자가 길이/톤 옵션 선택
   ↓
4. [클라이언트] POST /api/generate 요청
   - Body: { topic, pages: [{ pageIndex, pageText }], options: { length, tone } }
   ↓
5. [서버] API Route에서 요청 검증 (apps/web/app/api/generate/route.ts)
   - Zod 스키마 검증
   - DAILY_PAGE_LIMIT 체크 (환경변수)
   ↓
6. [서버] 토큰 가드 적용
   - estimateTokenCount()로 프롬프트 토큰 추정
   - 8k 토큰 초과 시 summarizeKoreanText()로 자동 축약
   ↓
7. [서버] 프롬프트 빌드 (packages/core/src/prompt.ts)
   - buildPrompt({ topic, pageIndex, pageText, length, tone })
   - DEFAULT_STYLE_PROMPT ({{STYLE_PROMPT}}) 주입
   ↓
8. [서버] OpenAI API 호출 (gpt-4o-mini)
   - System message: STYLE_PROMPT + version
   - User message: 프롬프트 + 명시적 length/tone
   - max_tokens: 800
   ↓
9. [서버] 응답 생성
   - outputs: [{ pageIndex, content }]
   - usage: { promptTokens, completionTokens, totalTokens }
   - cost: { inputCost, outputCost, totalCost }
   - meta: { length, tone, version, limits }
   ↓
10. [클라이언트] 결과 표시 및 다운로드
    - 페이지별 생성 결과 표시
    - 토큰/비용 배지 업데이트
    - Markdown 다운로드 기능
```

### CI/CD
- GitHub Actions 기반 CI에서 빌드/린트/테스트를 수행하고, 배포는 Vercel에 위임합니다.
- 유닛 테스트(Vitest) + E2E 테스트(Playwright) 자동 실행
- 테스트 아티팩트 업로드 (실패 시 디버깅용)

## Consequences

### 장점
- 패키지 간 의존성을 명확히 관리할 수 있으며, 추후 모바일/CLI 등 다른 인터페이스가 필요할 때 `@repo/core`를 재사용할 수 있습니다.
- Turbo 파이프라인으로 패키지 단위 캐시/병렬화를 활용할 수 있습니다.
- 클라이언트-서버 분리로 PDF 추출은 클라이언트 부담, OpenAI 호출은 서버에서 처리하여 API 키 보안을 유지합니다.
- 토큰 가드와 비용 제어를 서버 단에서 일괄 적용할 수 있습니다.

### 단점
- 모노레포 복잡도가 증가하므로, 작은 팀 기준으로는 문서화 및 CI 설정 유지가 필요합니다.
- 클라이언트 PDF 추출 방식은 대용량 파일이나 복잡한 PDF에서 성능 이슈가 발생할 수 있습니다.

## 확장 방향

### 1. OCR 모듈 연동
현재는 텍스트 기반 PDF만 지원하지만, 스캔 이미지 PDF 지원을 위해 OCR 모듈을 추가할 수 있습니다.

**구현 방안:**
- 새 패키지 `packages/ocr` 생성
- Azure Vision, Google Cloud Vision, Tesseract 등 OCR 서비스 연동
- API Route에서 PDF 타입 감지 후 OCR 처리 분기
  ```
  [서버] PDF 업로드 → 타입 감지
    ├─ 텍스트 PDF: PDF.js 추출
    └─ 스캔 PDF: OCR 서비스 호출 → 텍스트 추출
  ```

### 2. 작업 큐 시스템
대량 페이지 처리 시 동기 처리의 한계를 극복하기 위해 비동기 작업 큐를 도입할 수 있습니다.

**구현 방안:**
- BullMQ + Redis 도입
- API Route: 즉시 응답 + Job ID 반환
- Worker: 백그라운드 생성 처리
- 클라이언트: polling 또는 SSE로 진행상황 조회
  ```
  [클라이언트] → POST /api/generate → Job ID 반환
                     ↓
                  [Queue] → [Worker] → OpenAI API
                     ↓
  [클라이언트] ← GET /api/jobs/:id → 결과 조회
  ```

### 3. 프롬프트 버전 관리
`STYLE_PROMPT_VERSION` 기반으로 프롬프트 템플릿을 버전별로 관리할 수 있습니다.

**구현 방안:**
- `packages/core/prompts/` 디렉토리 생성
  - `v1-user.ts`: 현재 기본 프롬프트
  - `v2-agent.ts`: 에이전트 대상 프롬프트
  - `v3-formal.ts`: 공식 문서 대상 프롬프트
- API 요청에 `version` 파라미터 추가
- 응답 `meta`에 사용된 버전 명시 (이미 구현됨)
  ```typescript
  import { getPromptByVersion } from "@repo/core/prompts";

  const stylePrompt = getPromptByVersion(options.version || "v1-user");
  ```

### 4. 사용량 대시보드
조직/사용자별 사용량 추적 및 제한을 위한 대시보드를 추가할 수 있습니다.

**구현 방안:**
- 새 패키지 `packages/analytics` 생성
- 사용량 추적: Redis 또는 DB에 기록
  - 사용자 ID, 날짜, 페이지 수, 토큰 수, 비용
- 대시보드 페이지: `apps/web/app/dashboard`
- 제한 초과 시 429 응답 + 사용량 안내

### 5. 결과 편집 및 히스토리
생성된 화법 스크립트를 편집하고 히스토리를 관리하는 기능을 추가할 수 있습니다.

**구현 방안:**
- DB 도입 (PostgreSQL, MongoDB 등)
- 스키마: `{ userId, documentId, pageIndex, originalText, generatedScript, editedScript, createdAt }`
- UI: 인라인 편집 모드 + 저장 버튼
- 히스토리 조회: 사용자별 생성 기록 목록
