# 화법 생성 OCR

## 개요
- 텍스트 기반 PDF를 페이지 단위로 분석하고, OpenAI GPT 모델을 활용해 발표/화법 스크립트를 생성하는 POC입니다.
- Turbo + pnpm 기반 모노레포 구조이며 Next.js(App Router)를 사용한 웹 애플리케이션과 핵심 로직 패키지로 구성됩니다.
- OCR(스캔 이미지) 처리는 범위에서 제외하며, 텍스트가 추출 가능한 PDF 사용을 권장합니다.

## 빠른 시작
1. 의존성 설치  
   ```bash
   pnpm install
   ```
2. 환경 변수 템플릿을 복사하고 키를 채웁니다.  
   `.env.example` → `.env` (최소 `OPENAI_API_KEY`)
3. 로컬 개발 서버 실행  
   ```bash
   pnpm -C apps/web dev
   ```

## 환경 변수
| 변수 | 설명 |
| --- | --- |
| `OPENAI_API_KEY` | OpenAI API 키 (필수) |
| `OPENAI_BASE_URL` | 선택: 프록시/커스텀 엔드포인트 사용 시 |

## 제한 사항
- 동시 접속 인원 10명 내외를 가정합니다.
- 월 최대 200페이지(생성 요청 기준) 사용량을 권장합니다.
- 스캔본 PDF(OCR 필요)는 지원하지 않으며, 텍스트 추출이 가능한 PDF만 안정 작동합니다.

## 주요 패키지
- `apps/web`: Next.js 기반 사용자 인터페이스 및 API Route(`app/api/generate/route.ts`)
- `packages/core`: 프롬프트 구성과 비용 추정 로직 (`buildPrompt`, `estimateUsageCost`)
- `packages/ui`: Badge, Button, Card 등 공용 UI 컴포넌트 모음

## 사용 방법
- 홈 화면에서 PDF 파일을 업로드하면 페이지별 카드가 생성됩니다.
- 페이지별 또는 전체 일괄 생성 버튼으로 GPT-4o-mini 모델에 요청을 보내고, Markdown 결과를 확인/다운로드할 수 있습니다.
- 길이(짧게/중간/길게)와 톤(중립/격식/친근/설득)을 선택해 출력 스타일을 조정할 수 있습니다.

## 배포
- 기본 배포 대상은 Vercel입니다.
- CI 파이프라인(`.github/workflows/ci.yml`)에서 빌드/린트/테스트를 선행 후 Vercel에 연결하여 자동 배포를 구성할 수 있습니다.
- OpenAI 키는 Vercel Project 환경 변수로 등록합니다.

## 후속 로드맵
- OCR 모듈 연동(예: Azure Vision, Google Cloud Vision)으로 스캔 PDF 지원
- 생성 결과 편집 기능 및 히스토리 관리
- 조직/사용자별 사용량 대시보드
