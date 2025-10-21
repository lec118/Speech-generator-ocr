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

    expect(result).toContain("주제: 건강보험 소개");
  });

  it("should handle missing topic with default message", () => {
    const result = buildPrompt({
      ...basePage
    });

    expect(result).toContain("주제가 명시되지 않았습니다");
  });

  it("should include page index (1-based)", () => {
    const result = buildPrompt({
      ...basePage,
      pageIndex: 2
    });

    expect(result).toContain("대상 페이지: 3 페이지");
  });

  it("should include length guidance for 'short' option", () => {
    const result = buildPrompt({
      ...basePage,
      length: "short"
    });

    expect(result).toContain("목표: 120~180 토큰");
    expect(result).toContain("2~3개의 문단");
  });

  it("should include length guidance for 'medium' option", () => {
    const result = buildPrompt({
      ...basePage,
      length: "medium"
    });

    expect(result).toContain("목표: 250~400 토큰");
    expect(result).toContain("3~4개의 문단");
  });

  it("should include length guidance for 'long' option", () => {
    const result = buildPrompt({
      ...basePage,
      length: "long"
    });

    expect(result).toContain("목표: 500~700 토큰");
    expect(result).toContain("5개 이상의 문단");
  });

  it("should include tone guidance for 'basic' option", () => {
    const result = buildPrompt({
      ...basePage,
      tone: "basic"
    });

    expect(result).toContain("중립적이고 전문적인 말투");
    expect(result).toContain("균형잡힌 설명");
  });

  it("should include tone guidance for 'persuasive' option", () => {
    const result = buildPrompt({
      ...basePage,
      tone: "persuasive"
    });

    expect(result).toContain("설득");
    expect(result).toContain("행동 촉구");
    expect(result).toContain("가입을 유도");
  });

  it("should include tone guidance for 'explanatory' option", () => {
    const result = buildPrompt({
      ...basePage,
      tone: "explanatory"
    });

    expect(result).toContain("쉽게 풀어 설명");
    expect(result).toContain("예시와 비유");
  });

  it("should include tone guidance for 'bullet' option", () => {
    const result = buildPrompt({
      ...basePage,
      tone: "bullet"
    });

    expect(result).toContain("핵심 요점만");
    expect(result).toContain("bullet point 형식");
  });

  it("should include DEFAULT_STYLE_PROMPT placeholder", () => {
    const result = buildPrompt({
      ...basePage
    });

    expect(result).toContain("스타일 가이드:");
    expect(result).toContain(DEFAULT_STYLE_PROMPT);
  });

  it("should include page text in prompt", () => {
    const result = buildPrompt({
      ...basePage
    });

    expect(result).toContain("원문 텍스트:");
    expect(result).toContain(basePage.pageText);
  });

  it("should truncate very long text to MAX_SOURCE_CHARS (6000)", () => {
    const longText = "가".repeat(7000);
    const result = buildPrompt({
      pageIndex: 0,
      pageText: longText
    });

    // Should not contain all 7000 chars
    expect(result.length).toBeLessThan(longText.length + 1000);
    // Should contain truncated portion
    expect(result).toContain("가".repeat(100));
  });

  it("should handle empty pageText with fallback message", () => {
    const result = buildPrompt({
      pageIndex: 0,
      pageText: ""
    });

    expect(result).toContain("텍스트가 비어 있습니다");
  });

  it("should use default length and tone when not provided", () => {
    const result = buildPrompt({
      ...basePage
    });

    // Default is medium length
    expect(result).toContain("목표: 250~400 토큰");
    // Default is basic tone
    expect(result).toContain("중립적이고 전문적인 말투");
  });

  it("should combine all options correctly", () => {
    const result = buildPrompt({
      topic: "암보험 특징",
      pageIndex: 1,
      pageText: "암보험은 암 진단 시 목돈을 지급하는 보험입니다.",
      length: "long",
      tone: "persuasive"
    });

    expect(result).toContain("주제: 암보험 특징");
    expect(result).toContain("대상 페이지: 2 페이지");
    expect(result).toContain("목표: 500~700 토큰");
    expect(result).toContain("설득");
    expect(result).toContain("암보험은 암 진단 시");
  });

  it("should preserve STYLE_PROMPT_VERSION value", () => {
    expect(STYLE_PROMPT_VERSION).toBe("v1-user");
  });

  it("should preserve DEFAULT_STYLE_PROMPT placeholder", () => {
    expect(DEFAULT_STYLE_PROMPT).toBe("{{STYLE_PROMPT}}");
  });
});
