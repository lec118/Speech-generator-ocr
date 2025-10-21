export const DEFAULT_STYLE_PROMPT = "{{STYLE_PROMPT}}";
export const STYLE_PROMPT_VERSION = "v1-user";

export type LengthOption = "short" | "medium" | "long";
export type ToneOption = "basic" | "persuasive" | "explanatory" | "bullet";

export interface BuildPromptInput {
  topic?: string;
  pageIndex: number;
  pageText: string;
  length?: LengthOption;
  tone?: ToneOption;
}

const LENGTH_GUIDANCE: Record<LengthOption, string> = {
  short: "짧고 간결하게 2~3개 단락으로 정리. TTS 읽기 최적화로 문장 짧게. (목표: 120~180 토큰)",
  medium: "도입-문제인식-해결-핵심보장-마무리 구조. 3~4개 단락. (목표: 250~400 토큰)",
  long: "전체 6단 구조 + 예시/비교 포함. 상세 설명형. (목표: 500~700 토큰)"
};

const TONE_GUIDANCE: Record<ToneOption, string> = {
  basic: "설명형 상담 톤. 존칭 일관. 구어체로 자연스럽게.",
  persuasive: "광고형 톤. 행동 촉구형 문장 강화. '지금 바로~', '이제는~' 활용.",
  explanatory: "쉬운 설명 + 예시 중심. '예를 들어~', '혹시~' 같은 공감형 질문 활용.",
  bullet: "핵심 요점 나열. '첫째, 둘째, 셋째' 형식. 숫자 강조."
};

const MAX_SOURCE_CHARS = 6000;

/**
 * buildPrompt creates a structured user message for the OpenAI API.
 * It merges topic context, page content, and stylistic preferences.
 */
export function buildPrompt({
  topic,
  pageIndex,
  pageText,
  length = "medium",
  tone = "basic"
}: BuildPromptInput): string {
  const normalizedTopic = topic?.trim() || "주제가 명시되지 않았습니다.";
  const normalizedText = pageText.trim().slice(0, MAX_SOURCE_CHARS);
  const trimmedText = normalizedText || "텍스트가 비어 있습니다.";

  return [
    "당신은 보험 상품 설명 자료를 고객 상담·설명용 TTS 화법 대본으로 작성하는 전문가입니다.",
    "",
    `상품명/주제: ${normalizedTopic}`,
    `대상 페이지: ${pageIndex + 1} 페이지`,
    "",
    "📋 작성 조건:",
    "",
    "① 전체 구조 (반드시 포함):",
    "- 도입: 관심 유도형 질문으로 시작 ('혹시~해보셨어요?', '알고 계신가요?')",
    "  → 사회적 맥락(트렌드·통계·위험 인식) 짧게 언급",
    "- 문제 인식: 위험성, 비용 부담, 기존 보험의 한계 등을 간단히 제시",
    "- 해결 제안: '한화생명에서 준비한 [상품명]을 소개해드리겠습니다.'",
    "  → 핵심 키워드(간편가입, 체증형, 비급여, 환급형 등) 포함",
    "- 핵심 보장 포인트: '첫째, … / 둘째, … / 셋째, …' 형식으로 3가지 요약",
    "  → 금액·횟수·보장 범위 등 숫자는 강조하여 낭독 최적화",
    "- 예시/비교 (선택): 보장 사례나 경쟁사 대비 차이점을 '예를 들어~'로 연결",
    "- 마무리: '지금 바로~', '이제는~으로 대비하세요.' 같은 자연스러운 콜 투 액션",
    "  → 마지막 문장은 긍정적, 희망적인 어조로",
    "",
    "② 톤 & 스타일:",
    "- TTS 읽기 최적화형 구어체, 문장 길이 짧고 리듬감 있게",
    "- 숫자는 '3천만 원', '1년에 두 번', '10년 납'처럼 한글+숫자 혼용",
    "- 쉼표(,)와 줄바꿈으로 호흡 구분 명확하게",
    "- 존칭 일관 ('안녕하세요 고객님.', '소개해드릴게요.')",
    `- 요청 톤: ${TONE_GUIDANCE[tone]}`,
    `- 요청 길이: ${LENGTH_GUIDANCE[length]}`,
    "",
    "③ 출력 형식:",
    "- 제목: (간편가입) [상품명] – [핵심 키워드 요약] (TTS 최적화)",
    "- 본문: 단락별 줄바꿈 포함, Markdown 형식",
    "- 불필요한 마케팅 수식어, 문어체 제거",
    "- 최종 버전은 바로 낭독 가능한 형태로 작성",
    "",
    `스타일 가이드:\n${DEFAULT_STYLE_PROMPT}`,
    "",
    "아래 보험 상품 설명 자료를 기반으로, 위 조건을 반드시 지켜 TTS 화법 대본을 작성하세요.",
    "",
    `원문 텍스트:\n"""${trimmedText}"""`
  ].join("\n");
}
