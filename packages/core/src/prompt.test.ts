import { describe, it, expect } from "vitest";
import { buildPrompt, DEFAULT_STYLE_PROMPT, STYLE_PROMPT_VERSION } from "./prompt";

describe("buildPrompt", () => {
  const basePage = {
    pageIndex: 0,
    pageText: "건강보험은 질병이나 부상으로 인한 의료비를 보장하는 보험입니다."
  };

  it("should include topic in prompt when provided", () => {
    const result = buildPrompt({
      ...basePage,
      topic: "건강보험 소개"
    });

    expect(result).toContain("건강보험 소개");
  });

  it("should handle missing topic with default", () => {
    const result = buildPrompt({
      ...basePage
    });

    expect(result).toContain("한화생명 상품");
  });

  it("should include page index (1-based)", () => {
    const result = buildPrompt({
      ...basePage,
      pageIndex: 2
    });

    expect(result).toContain("[p.3]");
  });

  it("should include length guidance for 'short' option", () => {
    const result = buildPrompt({
      ...basePage,
      length: "short"
    });

    expect(result).toContain("약 300~400자");
    expect(result).toContain("핵심만 빠르게 요약");
  });

  it("should include length guidance for 'standard' option", () => {
    const result = buildPrompt({
      ...basePage,
      length: "standard"
    });

    expect(result).toContain("약 500~700자");
    expect(result).toContain("표준 분량");
  });

  it("should include length guidance for 'long' option", () => {
    const result = buildPrompt({
      ...basePage,
      length: "long"
    });

    expect(result).toContain("약 700~800자");
    expect(result).toContain("사례·비교 정보");
  });

  it("should include tone guidance for 'friendly' option", () => {
    const result = buildPrompt({
      ...basePage,
      tone: "friendly"
    });

    expect(result).toContain("상담형(친근) 톤");
    expect(result).toContain("공감과 안내 중심");
  });

  it("should include tone guidance for 'advertisement' option", () => {
    const result = buildPrompt({
      ...basePage,
      tone: "advertisement"
    });

    expect(result).toContain("광고형 톤");
    expect(result).toContain("혜택과 CTA");
  });

  it("should include tone guidance for 'warStyle' option", () => {
    const result = buildPrompt({
      ...basePage,
      tone: "warStyle"
    });

    expect(result).toContain("워스타일 톤");
    expect(result).toContain("짧고 강렬한 메시지");
  });

  it("should include delivery style guidance for 'empathy' option", () => {
    const result = buildPrompt({
      ...basePage,
      delivery: "empathy"
    });

    expect(result).toContain("공감형 화법");
    expect(result).toContain("고객 상황을 인정하고 공감");
  });

  it("should include delivery style guidance for 'expert' option", () => {
    const result = buildPrompt({
      ...basePage,
      delivery: "expert"
    });

    expect(result).toContain("전문가형 화법");
    expect(result).toContain("객관적 근거와 신뢰감");
  });

  it("should include accuracy guidelines", () => {
    const result = buildPrompt({
      ...basePage
    });

    expect(result).toContain("정확성 최우선");
    expect(result).toContain("오타 절대 금지");
    expect(result).toContain("전문 용어");
  });

  it("should include page text in prompt", () => {
    const result = buildPrompt({
      ...basePage
    });

    expect(result).toContain("참고 텍스트");
    expect(result).toContain(basePage.pageText);
  });

  it("should truncate very long text to MAX_SOURCE_CHARS (6000)", () => {
    const longText = "가".repeat(7000);
    const result = buildPrompt({
      pageIndex: 0,
      pageText: longText
    });

    // Should not contain all 7000 chars
    expect(result.length).toBeLessThan(longText.length + 2000);
    // Should contain truncated portion
    expect(result).toContain("가".repeat(100));
  });

  it("should handle empty pageText without crash", () => {
    const result = buildPrompt({
      pageIndex: 0,
      pageText: ""
    });

    expect(result).toContain("이미지");
    expect(result.length).toBeGreaterThan(0);
  });

  it("should use default options when not provided", () => {
    const result = buildPrompt({
      ...basePage
    });

    // Default is standard length
    expect(result).toContain("약 500~700자");
    // Default is friendly tone
    expect(result).toContain("상담형(친근) 톤");
    // Default is empathy delivery
    expect(result).toContain("공감형 화법");
  });

  it("should combine all options correctly", () => {
    const result = buildPrompt({
      topic: "암보험 특징",
      pageIndex: 1,
      pageText: "암보험은 암 진단 시 목돈을 지급하는 보험입니다.",
      length: "long",
      tone: "advertisement",
      delivery: "expert"
    });

    expect(result).toContain("암보험 특징");
    expect(result).toContain("[p.2]");
    expect(result).toContain("약 700~800자");
    expect(result).toContain("광고형 톤");
    expect(result).toContain("전문가형 화법");
    expect(result).toContain("암보험은 암 진단 시");
  });

  it("should preserve STYLE_PROMPT_VERSION value", () => {
    expect(STYLE_PROMPT_VERSION).toBe("v3-vision-topdown");
  });

  it("should preserve DEFAULT_STYLE_PROMPT placeholder", () => {
    expect(DEFAULT_STYLE_PROMPT).toBe("{STYLE_PROMPT}");
  });
});
