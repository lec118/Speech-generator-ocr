import type { LengthOption, ToneOption, DeliveryStyleOption } from "./types";
import { LENGTH_LABELS, TONE_LABELS, DELIVERY_LABELS } from "./types";

export const DEFAULT_STYLE_PROMPT = "{STYLE_PROMPT}";
export const STYLE_PROMPT_VERSION = "v3-vision-topdown";

export interface BuildPromptInput {
  topic?: string;
  pageIndex: number;
  pageText?: string;
  length?: LengthOption;
  tone?: ToneOption;
  delivery?: DeliveryStyleOption;
}

const LENGTH_GUIDANCE: Record<LengthOption, string> = {
  short: "약 300~400자, 핵심만 빠르게 요약",
  standard: "약 500~700자, 표준 분량으로 핵심과 구조를 모두 전달",
  long: "약 700~800자, 사례·비교 정보를 충분히 포함"
};

const TONE_GUIDANCE: Record<ToneOption, string> = {
  friendly: "상담형(친근) 톤 – 공감과 안내 중심",
  advertisement: "광고형 톤 – 혜택과 CTA를 명확히 강조",
  warStyle: "워스타일 톤 – 짧고 강렬한 메시지, 키워드 반복"
};

const DELIVERY_GUIDANCE: Record<DeliveryStyleOption, string> = {
  empathy: "공감형 화법 – 고객 상황을 인정하고 공감 문구 활용",
  friendly: "친근형 화법 – 일상적인 어휘와 부드러운 리듬",
  expert: "전문가형 화법 – 객관적 근거와 신뢰감 있는 전달"
};

const MAX_SOURCE_CHARS = 6000;

function summarizeOptions({
  tone,
  delivery,
  length
}: {
  tone: ToneOption;
  delivery: DeliveryStyleOption;
  length: LengthOption;
}): string {
  return `tone=${TONE_LABELS[tone]}, delivery=${DELIVERY_LABELS[delivery]}, length=${LENGTH_LABELS[length]}`;
}

export function buildPrompt({
  topic,
  pageIndex,
  pageText,
  length = "standard",
  tone = "friendly",
  delivery = "empathy"
}: BuildPromptInput): string {
  const normalizedTopic = topic?.trim() || "한화생명 상품";
  const rawText = typeof pageText === "string" ? pageText.trim() : "";
  const normalizedText = rawText.slice(0, MAX_SOURCE_CHARS);
  const trimmedText = normalizedText || "[첨부된 페이지 이미지를 직접 읽고 핵심 정보를 파악하세요.]";

  const formattedPageIndex = `[p.${pageIndex + 1}]`;
  const optionSummary = summarizeOptions({ tone, delivery, length });

  const sections: string[] = [
    "# 🧩 한화생명 상품 이미지 기반 TTS 화법 생성 프롬프트",
    "",
    "다음에 제공되는 **보험 상품 이미지/자료(그림 파일)** 를 기반으로,",
    "실제 상담에서 바로 읽을 수 있는 **TTS 최적화 화법 대본**을 작성하세요.",
    "",
    `- 분석 대상 페이지: ${formattedPageIndex}`,
    `- 상품 키워드: ${normalizedTopic}`,
    "",
    "---",
    "",
    "## ⚠️ 중요: 정확성 최우선",
    "- **오타 절대 금지**: 이미지의 모든 텍스트(특히 의료/전문 용어, 상품명, 수치)를 **정확하게** 읽어주세요.",
    "  - 예: '고막성형술'을 '고마성형술'로 잘못 읽지 않기",
    "  - 예: '치료비'를 '치료미'로 잘못 읽지 않기",
    "- **숫자와 단위**: 금액, 비율, 날짜 등은 이미지에 표시된 그대로 정확히 전달하세요.",
    "- **전문 용어**: 의료 용어, 보험 용어 등은 이미지 원문을 두 번 확인하여 정확하게 작성하세요.",
    "- **불확실하면**: 원문 그대로 사용하는 것이 최선입니다.",
    "",
    "## 🚫 제외할 요소",
    "다음 요소들은 **절대 TTS 스크립트에 포함하지 마세요**:",
    "- 페이지 번호 (예: \"1/16\", \"p.1\", \"Page 1\" 등)",
    "- 워터마크, 로고 설명 (회사 로고 자체는 괜찮음, 단 \"워터마크\" 같은 메타 설명은 제외)",
    "- 각주나 면책 조항의 작은 글씨 (법적 필수 문구가 아닌 경우)",
    "- 문서 메타데이터 (작성일, 버전 번호, 내부 코드 등)",
    "- \"이미지\", \"그림\", \"도표\" 같은 메타 설명 (내용은 설명하되 '이미지입니다' 같은 표현 제외)",
    "",
    "---",
    "",
    "## 🎛 고정 생성 옵션",
    `- **tone:** ${TONE_LABELS[tone]} (${TONE_GUIDANCE[tone]})`,
    `- **delivery:** ${DELIVERY_LABELS[delivery]} (${DELIVERY_GUIDANCE[delivery]})`,
    `- **length:** ${LENGTH_LABELS[length]} (${LENGTH_GUIDANCE[length]})`,
    "- **ssml:** 사용하지 않음 (break time 등 SSML 태그 생성 금지)",
    "",
    `> 현재 옵션: ${optionSummary}`,
    "",
    "---",
    "",
    "## 🧭 구성 원칙",
    "- **Top-Down 생성:** 이미지의 시각적 흐름을 **상→하, 좌→우** 순서로 따라가며 서술합니다.",
    "- **섹션 보존:** 제목·부제·표·도형 등은 **등장 순서 그대로 반영**하고 재배열하지 않습니다.",
    "- **다열 레이아웃:** 카드/다단 구조는 **좌측부터 우측** 순서로 설명합니다.",
    "- **복수 상품:** 여러 플랜이 있으면 **등장 순서대로 각각 별도 스크립트**를 작성합니다.",
    "- **리스트 변환:** 불릿 포인트는 자연스러운 문장으로 연결합니다.",
    "",
    "---",
    "",
    "## 🗣 톤 & 스타일 가이드",
    "- 존칭 일관 (\"안녕하세요 고객님\", \"말씀드릴게요\" 등).",
    "- **어미는 ‘-요’와 ‘~하지요/됩니다’ 등을 자연스럽게 섞어 사용**하여 리듬감을 줍니다.",
    "- 주요 문장 끝맺음은 문맥에 따라 ‘요/다/되지요’ 등을 조화롭게 사용합니다.",
    "- 짧은 문장과 부드러운 쉼표·줄바꿈으로 호흡을 정리합니다.",
    "- **판매 압박 금지:** ‘준비’, ‘선택’, ‘대비’ 중심으로 안내합니다.",
    "- **환급률 표현:** 10년 후, 20년 후 두 시점만 언급합니다 (15년 제외). '수익률'이라는 용어는 사용하지 말고 반드시 '환급률'을 사용하세요.",
    "- **비교·최상급:** 이미지에 명시된 정보에만 근거합니다.",
    "- **표기 규칙:** “3만 1천 344원”, “101.5%”, “1억 1천만 원” 형태를 유지합니다.",
    "- **상품명/특약명:** 이미지 표기 그대로 사용합니다.",
    "- **법규 준수:** 확정수익·과장표현은 금지합니다.",
    "",
    "---",
    "",
    "## 🧾 출력 형식",
    "### ① 본문 스크립트 (Top-Down TTS용)",
    "- **제목:** `(간편가입) [상품명] – [핵심 키워드 요약]`",
    "- **본문:** 이미지의 상→하, 좌→우 순서로 섹션을 따라가며 작성합니다.",
    "- SSML 태그는 전환부에만 최소한으로 사용합니다.",
    "",
    "---",
    "",
    "## ▶️ 생성 지시문",
    "첨부한 **이미지의 텍스트와 구성 요소를 상→하, 좌→우로 정밀하게 읽고**,",
    "사실을 그대로 반영한 **친근한 상담형 TTS 화법**을 Top-Down 본문 스크립트로 작성해 주세요.",
    "",
    "**반드시 준수할 사항:**",
    "1. 이미지의 모든 텍스트(특히 의료/전문 용어)를 정확하게 읽고 오타 없이 작성",
    "2. 숫자, 금액, 비율, 날짜는 이미지와 100% 일치하도록 작성",
    "3. 상품명, 특약명, 전문 용어는 원문 그대로 사용",
    "4. SSML 태그(break time 등)는 절대 생성하지 않음",
    "",
    "**스타일 가이드:**",
    "- 어미는 '-요', '-다', '~하지요' 등을 문맥과 감정선에 맞춰 혼합하세요.",
    "- 문장 사이사이에는 고객 공감 표현('되시지요', '든든하지요')을 자연스럽게 배치하세요.",
  ];

  if (!rawText) {
    return sections.join("\n");
  }

  return sections
    .concat([
      "---",
      "## 📄 참고 텍스트",
      "\"\"\"",
      trimmedText,
      "\"\"\""
    ])
    .join("\n");
}
