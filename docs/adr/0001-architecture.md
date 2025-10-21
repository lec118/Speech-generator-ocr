# ADR 0001: POC Architecture

- Status: Accepted
- Date: 2025-10-21

## Context
- 발표/화법 스크립트 생성을 빠르게 검증하기 위한 POC가 필요합니다.
- 다수의 실험을 병행하기 위해 애플리케이션과 핵심 로직, UI 패키지를 느슨하게 결합한 모노레포 구성이 요구됩니다.
- 클라우드 배포(Vercel)와 OpenAI API 연동을 가정합니다.

## Decision
- `turbo` + `pnpm`을 사용한 모노레포를 채택하고, 앱(`apps/web`)과 공용 패키지(`packages/core`, `packages/ui`)를 분리합니다.
- Next.js(App Router)를 사용해 PDF 업로드 → 페이지 추출 → OpenAI 호출을 담당하는 단일 웹 애플리케이션을 구현합니다.
- 스타일 및 프롬프트 변형이 잦은 도메인 특성상, 프롬프트 빌더(`packages/core`)와 UI 컴포넌트(`packages/ui`)를 별도 패키지로 두어 재사용성과 독립 배포 가능성을 열어둡니다.
- GitHub Actions 기반 CI에서 빌드/린트/테스트를 수행하고, 배포는 Vercel에 위임합니다.

## Consequences
- 패키지 간 의존성을 명확히 관리할 수 있으며, 추후 모바일/CLI 등 다른 인터페이스가 필요할 때 `@repo/core`를 재사용할 수 있습니다.
- Turbo 파이프라인으로 패키지 단위 캐시/병렬화를 활용할 수 있습니다.
- 모노레포 복잡도가 증가하므로, 작은 팀 기준으로는 문서화 및 CI 설정 유지가 필요합니다.
- OCR 모듈이 추가되는 경우, 새로운 패키지(`packages/ocr` 등)를 추가하거나 API 레이어를 확장하는 방식으로 대응할 수 있습니다.
