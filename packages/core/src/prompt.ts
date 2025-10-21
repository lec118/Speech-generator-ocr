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
  short: "짧고 간결하게 핵심 메시지를 2~3개의 문단으로 정리합니다. (목표: 120~180 토큰)",
  medium: "중간 길이로 서론-본론-결론 구조를 갖추고 3~4개의 문단으로 구성합니다. (목표: 250~400 토큰)",
  long: "풍부한 사례와 설명을 포함하여 5개 이상의 문단으로 확장합니다. (목표: 500~700 토큰)"
};

const TONE_GUIDANCE: Record<ToneOption, string> = {
  basic: "중립적이고 전문적인 말투를 유지하며, 균형잡힌 설명을 제공합니다.",
  persuasive: "청중을 설득할 수 있도록 강한 메시지와 행동 촉구를 포함하며, 가입을 유도하는 표현을 사용합니다.",
  explanatory: "복잡한 개념을 쉽게 풀어 설명하고, 예시와 비유를 활용하여 이해를 돕습니다.",
  bullet: "핵심 요점만 간단명료하게 나열하며, bullet point 형식으로 구조화합니다."
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
    "당신은 한국어 화법 스크립트를 작성하는 전문 작가입니다.",
    `주제: ${normalizedTopic}`,
    `대상 페이지: ${pageIndex + 1} 페이지`,
    `요청 길이: ${LENGTH_GUIDANCE[length]}`,
    `요청 톤: ${TONE_GUIDANCE[tone]}`,
    `스타일 가이드:\n${DEFAULT_STYLE_PROMPT}`,
    "아래의 원문 텍스트를 바탕으로 발표용 스크립트를 작성하세요.",
    '결과는 Markdown 형식으로 작성하고, 필요한 경우 bullet과 강조를 적절히 사용합니다.',
    '스크립트는 서론, 본론, 결론을 포함하고, 청중의 이해를 돕는 연결 문장을 추가합니다.',
    `원문 텍스트:\n"""${trimmedText}"""`
  ].join("\n\n");
}
