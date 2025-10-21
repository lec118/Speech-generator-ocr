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

### 필수 환경 변수
| 변수 | 설명 | 기본값 |
| --- | --- | --- |
| `OPENAI_API_KEY` | OpenAI API 키 (필수) | - |

### 선택적 환경 변수
| 변수 | 설명 | 기본값 |
| --- | --- | --- |
| `OPENAI_BASE_URL` | 프록시/커스텀 엔드포인트 사용 시 | - |
| `DAILY_PAGE_LIMIT` | 일일 최대 페이지 처리 제한 (429 에러) | `200` |
| `CONCURRENCY_HINT` | 동시 사용자 힌트 (로깅/모니터링용) | `10` |

**설정 예시** (`.env`)
```bash
OPENAI_API_KEY=sk-your-key-here
OPENAI_BASE_URL=https://api.openai.com/v1  # 선택
DAILY_PAGE_LIMIT=200
CONCURRENCY_HINT=10
```

## 제한 사항
- 동시 접속 인원 10명 내외를 가정합니다.
- 월 최대 200페이지(생성 요청 기준) 사용량을 권장합니다.
- 스캔본 PDF(OCR 필요)는 지원하지 않으며, 텍스트 추출이 가능한 PDF만 안정 작동합니다.

## 주요 패키지
- `apps/web`: Next.js 기반 사용자 인터페이스 및 API Route(`app/api/generate/route.ts`)
- `packages/core`: 프롬프트 구성과 비용 추정 로직 (`buildPrompt`, `estimateUsageCost`)
- `packages/ui`: Badge, Button, Card 등 공용 UI 컴포넌트 모음

## 사용 방법

### 1. PDF 업로드
- 홈 화면에서 텍스트 기반 PDF 파일을 업로드하면 페이지별 카드가 생성됩니다.
- 각 카드에는 추출된 원문 텍스트와 "이 페이지 생성" 버튼이 표시됩니다.

### 2. 옵션 선택

#### 길이 (Length) 옵션
화법 스크립트의 목표 토큰 길이를 설정합니다.

| 옵션 | UI 레이블 | 목표 토큰 | 설명 |
| --- | --- | --- | --- |
| `short` | 짧게 (120~180) | 120-180 tokens | 핵심 메시지 2~3개 문단 |
| `medium` | 중간 (250~400) | 250-400 tokens | 서론-본론-결론 구조, 3~4개 문단 |
| `long` | 길게 (500~700) | 500-700 tokens | 풍부한 사례와 설명, 5개 이상 문단 |

#### 톤 (Tone) 옵션
화법 스크립트의 말투와 스타일을 설정합니다.

| 옵션 | UI 레이블 | 설명 |
| --- | --- | --- |
| `basic` | 기본 | 중립적이고 전문적인 말투, 균형잡힌 설명 |
| `persuasive` | 설득형 | 청중 설득, 강한 메시지, 가입 유도 표현 |
| `explanatory` | 설명형 | 쉬운 설명, 예시와 비유 활용, 이해 중심 |
| `bullet` | 요점형 | 핵심 요점 나열, bullet point 형식 |

### 3. 화법 생성
- **개별 생성**: 각 페이지 카드의 "이 페이지 생성" 버튼 클릭
- **일괄 생성**: "전체 페이지 생성" 버튼으로 모든 페이지 한번에 처리
- 생성 완료 후 결과를 확인하고 "결과 Markdown 다운로드" 버튼으로 저장

### 4. 결과 확인
- 각 페이지 카드에 생성된 화법 스크립트가 표시됩니다.
- 상단 배지에서 사용 토큰 수와 예상 비용을 실시간 확인할 수 있습니다.
- 생성 결과는 Markdown 형식으로 다운로드 가능합니다.

## 배포
- 기본 배포 대상은 Vercel입니다.
- CI 파이프라인(`.github/workflows/ci.yml`)에서 빌드/린트/테스트를 선행 후 Vercel에 연결하여 자동 배포를 구성할 수 있습니다.
- OpenAI 키는 Vercel Project 환경 변수로 등록합니다.

## 후속 로드맵
- OCR 모듈 연동(예: Azure Vision, Google Cloud Vision)으로 스캔 PDF 지원
- 생성 결과 편집 기능 및 히스토리 관리
- 조직/사용자별 사용량 대시보드
