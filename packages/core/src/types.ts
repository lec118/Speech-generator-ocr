/**
 * Shared types for TTS speech generation
 */

// Options
export type LengthOption = "short" | "standard" | "long";
export type ToneOption = "friendly" | "advertisement" | "warStyle";
export type DeliveryStyleOption = "empathy" | "friendly" | "expert";
export type LanguageOption = "none" | "english" | "chinese" | "vietnamese";

// Page data structure (PDF/image page rendered as data URL for GPT vision)
export interface PageData {
  index: number;
  /**
   * Data URL (e.g. data:image/png;base64,...) representing the rendered page
   */
  imageDataUrl: string;
  /**
   * Optional short label for UI display (e.g. page file name)
   */
  label?: string;
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
    imageDataUrl: string;
  }>;
  options: {
    length: LengthOption;
    tone: ToneOption;
    delivery: DeliveryStyleOption;
  };
}

export interface GenerateResponse {
  outputs: GenerationResult[];
  usage: UsageSummary;
  cost: CostSummary;
  meta: {
    length: LengthOption;
    tone: ToneOption;
    delivery: DeliveryStyleOption;
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
  short: "\uC9E7\uAC8C (300~400\uC790)",
  standard: "\uD45C\uC900 (500~700\uC790)",
  long: "\uAE38\uAC8C (700~800\uC790)"
};

export const TONE_LABELS: Record<ToneOption, string> = {
  friendly: "\uC0C1\uB2F4\uD615(\uCE5C\uADFC)",
  advertisement: "\uAD11\uACE0\uD615",
  warStyle: "\uC6CC\uC2A4\uD0C0\uC77C"
};

export const DELIVERY_LABELS: Record<DeliveryStyleOption, string> = {
  empathy: "\uACF5\uAC10\uD615",
  friendly: "\uCE5C\uADFC\uD615",
  expert: "\uC804\uBB38\uAC00\uD615"
};

export const LANGUAGE_LABELS: Record<LanguageOption, string> = {
  none: "\uc120\ud0dd \uc548\ud568",
  english: "\uc601\uc5b4",
  chinese: "\uc911\uad6d\uc5b4",
  vietnamese: "\ubca0\ud2b8\ub0a8\uc5b4"
};
