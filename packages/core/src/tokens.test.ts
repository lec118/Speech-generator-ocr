import { describe, it, expect } from "vitest";
import { estimateTokenCount, summarizeKoreanText } from "./tokens";

describe("estimateTokenCount", () => {
  it("should return 0 for empty string", () => {
    expect(estimateTokenCount("")).toBe(0);
  });

  it("should estimate tokens for Korean text", () => {
    const koreanText = "안녕하세요"; // 5 Korean chars
    const tokens = estimateTokenCount(koreanText);

    // Korean chars ~ 0.7 tokens each, so 5 * 0.7 = 3.5, ceil = 4
    expect(tokens).toBeGreaterThanOrEqual(3);
    expect(tokens).toBeLessThanOrEqual(5);
  });

  it("should estimate tokens for English text", () => {
    const englishText = "Hello World"; // 11 chars
    const tokens = estimateTokenCount(englishText);

    // English ~ 0.25 tokens per char, so 11 * 0.25 = 2.75, ceil = 3
    expect(tokens).toBeGreaterThanOrEqual(2);
    expect(tokens).toBeLessThanOrEqual(4);
  });

  it("should estimate tokens for mixed Korean/English text", () => {
    const mixedText = "건강보험 Health Insurance 소개";
    const tokens = estimateTokenCount(mixedText);

    expect(tokens).toBeGreaterThan(0);
    expect(tokens).toBeLessThan(mixedText.length); // Should be less than char count
  });

  it("should handle long Korean text", () => {
    const longText = "가".repeat(1000);
    const tokens = estimateTokenCount(longText);

    // 1000 Korean chars * 0.7 = 700 tokens
    expect(tokens).toBeGreaterThanOrEqual(650);
    expect(tokens).toBeLessThanOrEqual(750);
  });
});

describe("summarizeKoreanText", () => {
  it("should return original text if within target tokens", () => {
    const text = "짧은 텍스트입니다.";
    const result = summarizeKoreanText(text, 1000);

    expect(result).toBe(text);
  });

  it("should truncate text when exceeds target tokens", () => {
    const longText = "첫 번째 문장입니다. 두 번째 문장입니다. 세 번째 문장입니다. 네 번째 문장입니다.";
    const result = summarizeKoreanText(longText, 10);

    expect(result.length).toBeLessThan(longText.length);
  });

  it("should preserve sentence boundaries when truncating", () => {
    const text = "첫 번째 문장입니다. 두 번째 문장입니다. 세 번째 문장입니다.";
    const result = summarizeKoreanText(text, 15);

    // Should end with a period or question mark
    expect(result).toMatch(/[.!?]$/);
  });

  it("should handle text with newlines", () => {
    const text = "첫 줄입니다.\n두 번째 줄입니다.\n세 번째 줄입니다.";
    const result = summarizeKoreanText(text, 10);

    expect(result.length).toBeLessThan(text.length);
  });

  it("should add ellipsis when no sentence boundary found", () => {
    const text = "이것은매우긴문장으로마침표가없습니다";
    const result = summarizeKoreanText(text, 5);

    expect(result).toMatch(/\.\.\.$/);
  });

  it("should handle empty text", () => {
    const result = summarizeKoreanText("", 100);

    expect(result).toBe("");
  });

  it("should apply safety margin (90%)", () => {
    const text = "가".repeat(100) + ". " + "나".repeat(100) + ".";
    const targetTokens = 50;
    const result = summarizeKoreanText(text, targetTokens);

    const resultTokens = estimateTokenCount(result);
    // Should be less than target due to safety margin
    expect(resultTokens).toBeLessThanOrEqual(targetTokens);
  });

  it("should preserve Korean punctuation", () => {
    const text = "건강보험이란? 질병 보장입니다! 중요합니다.";
    const result = summarizeKoreanText(text, 20);

    expect(result).toMatch(/[.!?]$/);
  });

  it("should handle very small target tokens", () => {
    const text = "건강보험은 중요합니다. 가입하세요.";
    const result = summarizeKoreanText(text, 1);

    // Should still return something
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThan(text.length);
  });
});
