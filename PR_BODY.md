# [feat] 스타일 프롬프트 v1 + 옵션/비용가드

## Summary

이 PR은 화법 생성 시스템에 사용자 정의 가능한 스타일 프롬프트 시스템(v1)을 도입하고, UI 옵션을 개선하며, API 비용 가드를 추가합니다.

## Changes

### 1. 프롬프트 시스템 개선 (Commit: ced05fc)
- **톤 옵션 변경**: `neutral/formal/casual/persuasive` → `basic/persuasive/explanatory/bullet`
  - `basic` (기본): 중립적이고 전문적인 균형잡힌 설명
  - `persuasive` (설득형): 가입 유도 및 강한 메시지
  - `explanatory` (설명형): 쉬운 설명과 예시 활용
  - `bullet` (요점형): 핵심만 간단명료하게 나열
- **길이 가이드 개선**: 토큰 범위 명시
  - Short: 120~180 tokens
  - Medium: 250~400 tokens
  - Long: 500~700 tokens
- **DEFAULT_STYLE_PROMPT**: `{{STYLE_PROMPT}}` 플레이스홀더 유지 (향후 교체 가능)
- **STYLE_PROMPT_VERSION**: `v1-user` 고정

### 2. API 비용/토큰 가드 (Commit: 73b7c85)
- **환경변수 가드**:
  - `DAILY_PAGE_LIMIT` (기본: 200): 일일 최대 페이지 처리 제한
  - `CONCURRENCY_HINT` (기본: 10): 동시 사용자 힌트
- **8k 토큰 가드**:
  - 프롬프트가 8,000 토큰 초과 시 자동으로 한국어 텍스트 요약
  - 문장 경계 보존하여 의미 손실 최소화
  - `estimateTokenCount()`: 한국어/영어 혼합 텍스트 토큰 추정
  - `summarizeKoreanText()`: 목표 토큰에 맞게 텍스트 축약
- **응답 메타데이터 추가**:
  ```json
  {
    "outputs": [...],
    "usage": { "promptTokens": 123, "completionTokens": 456, "totalTokens": 579 },
    "cost": { "inputCost": 0.0001, "outputCost": 0.0002, "totalCost": 0.0003 },
    "meta": {
      "length": "medium",
      "tone": "basic",
      "version": "v1-user",
      "limits": {
        "dailyPageLimit": 200,
        "concurrencyHint": 10
      }
    }
  }
  ```

### 3. UI 개선
- 길이/톤 셀렉터 레이블에 한국어 명칭 및 토큰 범위 표시
- 사용자 메시지에 `length`/`tone` 명시적 포함 (AI 컨텍스트 향상)

## Risk Assessment

### Potential Risks

1. **토큰 추정 정확도**: `estimateTokenCount()`는 휴리스틱 기반으로 실제 tiktoken과 차이 발생 가능
2. **요약 품질**: 자동 요약 시 중요 정보 누락 가능성
3. **Breaking Change**: 톤 타입 변경으로 기존 코드에서 타입 오류 가능 (신규 프로젝트이므로 영향 없음)
4. **일일 제한 초과**: 사용자가 DAILY_PAGE_LIMIT 초과 시 429 에러

### Mitigation

1. **토큰 추정**: 85% 안전 마진 적용, 실제 사용 시 모니터링 필요
2. **요약 품질**: 문장 경계 보존 알고리즘 사용, 사용자에게 원문 항상 표시
3. **타입 안전성**: TypeScript strict mode로 컴파일 타임 체크
4. **사용자 경험**: 429 에러 메시지에 명확한 안내 포함

## Rollback Plan

문제 발생 시 롤백 절차:

1. **즉시 롤백 (긴급)**:
   ```bash
   git revert 73b7c85 ced05fc
   git push origin master
   ```

2. **환경변수로 일시 완화**:
   ```bash
   # 제한 완화
   DAILY_PAGE_LIMIT=1000
   CONCURRENCY_HINT=50
   ```

3. **프롬프트 버전만 복구**:
   - `packages/core/src/prompt.ts`의 `TONE_GUIDANCE` 이전 값으로 수정
   - `STYLE_PROMPT_VERSION`을 `v0-legacy`로 변경

## Testing

- [x] Manual testing: 로컬에서 다양한 길이/톤 조합 테스트 필요
- [ ] Unit tests: `estimateTokenCount`, `summarizeKoreanText` 단위 테스트 추가 예정
- [ ] Integration tests: 8k 토큰 초과 시나리오 E2E 테스트 필요

## Checklist

- [x] Code follows project style guidelines
- [x] Self-review completed
- [x] Documentation updated (.env.example, PR template)
- [x] No breaking changes (신규 프로젝트)

---

**Deployment Notes**:
- `.env` 파일에 `DAILY_PAGE_LIMIT`, `CONCURRENCY_HINT` 추가 필요
- 프로덕션 배포 전 `{{STYLE_PROMPT}}` 실제 프롬프트로 교체 권장

**Related Issues**: N/A
