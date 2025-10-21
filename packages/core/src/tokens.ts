/**
 * Token estimation utilities for Korean/English text
 * Uses rough heuristics instead of tiktoken to avoid dependencies
 */

const KOREAN_CHAR_TO_TOKEN_RATIO = 0.7; // Korean chars typically ~0.7 tokens each
const ENGLISH_CHAR_TO_TOKEN_RATIO = 0.25; // English ~4 chars per token

/**
 * Estimates token count for mixed Korean/English text
 * This is a rough approximation for planning purposes
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;

  const koreanChars = (text.match(/[\u3131-\uD79D]/g) || []).length;
  const otherChars = text.length - koreanChars;

  const koreanTokens = koreanChars * KOREAN_CHAR_TO_TOKEN_RATIO;
  const englishTokens = otherChars * ENGLISH_CHAR_TO_TOKEN_RATIO;

  return Math.ceil(koreanTokens + englishTokens);
}

/**
 * Summarizes Korean text to fit within target token count
 * Uses simple truncation with sentence boundary preservation
 */
export function summarizeKoreanText(text: string, targetTokens: number): string {
  const currentTokens = estimateTokenCount(text);

  if (currentTokens <= targetTokens) {
    return text;
  }

  // Calculate target character length
  const ratio = targetTokens / currentTokens;
  const targetLength = Math.floor(text.length * ratio * 0.9); // 90% safety margin

  // Find sentence boundary near target
  const truncated = text.slice(0, targetLength);
  const sentenceEndings = /[.!?\n]\s*/g;
  const matches = Array.from(truncated.matchAll(sentenceEndings));

  if (matches.length > 0) {
    const lastMatch = matches[matches.length - 1];
    return truncated.slice(0, lastMatch.index! + 1).trim();
  }

  // Fallback: hard truncate with ellipsis
  return truncated.trim() + "...";
}
