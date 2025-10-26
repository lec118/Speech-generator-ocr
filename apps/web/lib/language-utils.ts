import type { LanguageOption } from "@repo/core";
import { LANGUAGE_LABELS } from "@repo/core";

/**
 * Maps LanguageOption to TTS language codes
 */
export const LANGUAGE_TO_TTS_CODE: Record<LanguageOption, string> = {
  none: "ko",
  english: "en",
  chinese: "zh",
  vietnamese: "vi"
} as const;

/**
 * Gets copy button text for each language
 */
export function getCopyButtonText(lang: LanguageOption): string {
  const labels: Record<LanguageOption, string> = {
    none: "📋 복사하기",
    english: "📋 Copy",
    chinese: "📋 复制",
    vietnamese: "📋 Sao chép"
  };
  return labels[lang];
}

/**
 * Gets copy success message for each language
 */
export function getCopySuccessMessage(lang: LanguageOption): string {
  const messages: Record<LanguageOption, string> = {
    none: "복사되었습니다.",
    english: "Copied!",
    chinese: "已复制！",
    vietnamese: "Đã sao chép!"
  };
  return messages[lang];
}

/**
 * Gets language label
 */
export function getLanguageLabel(lang: LanguageOption): string {
  return LANGUAGE_LABELS[lang];
}
