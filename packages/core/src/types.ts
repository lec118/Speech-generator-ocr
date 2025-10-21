/**
 * Shared types for TTS speech generation
 */

// Options
export type LengthOption = "short" | "medium" | "long";
export type ToneOption = "basic" | "persuasive" | "explanatory" | "bullet";

// Page data structure
export interface PageData {
  index: number;
  text: string;
}

// Generation results
export interface GenerationResult {
  pageIndex: number;
  content: string;
}

// API request/response types
export interface GenerateRequest {
  topic?: string;
  pages: Array<{
    pageIndex: number;
    pageText: string;
  }>;
  options: {
    length: LengthOption;
    tone: ToneOption;
  };
}

export interface GenerateResponse {
  outputs: GenerationResult[];
  usage: UsageSummary;
  cost: CostSummary;
  meta: {
    length: LengthOption;
    tone: ToneOption;
    version: string;
    limits: {
      dailyPageLimit: number;
      concurrencyHint: number;
    };
  };
}

// Usage and cost tracking
export interface UsageSummary {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface CostSummary {
  inputCost: number;
  outputCost: number;
  totalCost: number;
}

// UI-specific types
export interface MarkdownSection {
  title: string;
  content: string;
}

// File processing types
export type SupportedFileType = "application/pdf" | `image/${string}`;

export interface FileProcessingResult {
  pages: PageData[];
  error?: string;
}

// Option labels (for UI display)
export const LENGTH_LABELS: Record<LengthOption, string> = {
  short: "짧게 (300~400자)",
  medium: "중간 (500~700자)",
  long: "길게 (800~1000자)"
};

export const TONE_LABELS: Record<ToneOption, string> = {
  basic: "기본 (설명형)",
  persuasive: "설득형 (광고형)",
  explanatory: "설명형 (예시중심)",
  bullet: "요점형 (숫자강조)"
};
