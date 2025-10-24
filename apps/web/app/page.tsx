"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@repo/ui";
import type { DeliveryStyleOption, LengthOption, PageData, ToneOption, LanguageOption } from "@repo/core";
import { LANGUAGE_LABELS } from "@repo/core";
import { ApiKeyScreen } from "../components/ApiKeyScreen";
import { Header } from "../components/Header";
import { FileUploadZone } from "../components/FileUploadZone";
import { PreviewPanel } from "../components/PreviewPanel";
import { ResultPanel } from "../components/ResultPanel";
import { useApiKey } from "../hooks/useApiKey";
import { useFilePreview, type FileType } from "../hooks/useFilePreview";
import { useFileProcessor } from "../hooks/useFileProcessor";
import { useGeneration } from "../hooks/useGeneration";
import { useProgressDisplay } from "../hooks/useProgressDisplay";
import { parsePageInput } from "../lib/page-parser";

const DEFAULT_LENGTH: LengthOption = "standard";
const DEFAULT_DELIVERY: DeliveryStyleOption = "empathy";
const DEFAULT_TONE: ToneOption = "friendly";

interface OptionActionsProps {
  disabled: boolean;
  pageCount: number;
  isPdf: boolean;
  onGenerateAll: () => void;
  onOpenRangeModal: () => void;
  hasResult: boolean;
  onOpenLastResult: () => void;
  errorMessage: string | null;
}

function OptionActionsCard({
  disabled,
  pageCount,
  isPdf,
  onGenerateAll,
  onOpenRangeModal,
  hasResult,
  onOpenLastResult,
  errorMessage
}: OptionActionsProps) {
  return (
    <section className="relative mx-auto w-full max-w-3xl rounded-3xl bg-gray-100 px-6 py-8 shadow-inner">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button
          onClick={onGenerateAll}
          disabled={disabled || pageCount === 0}
          className="h-12 flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-base font-semibold text-white shadow-md hover:from-indigo-700 hover:to-purple-700 hover:shadow-lg active:scale-95 disabled:from-gray-400 disabled:to-gray-500"
          data-testid="btn-generate-all"
        >
          전체 생성
        </Button>
        <button
          onClick={onOpenRangeModal}
          disabled={disabled || !isPdf || pageCount === 0}
          className="inline-flex h-12 flex-1 items-center justify-center rounded-md border border-white bg-white px-4 py-2 text-base font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 active:scale-95 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
          data-testid="btn-generate-selected"
        >
          선택하기
        </button>
      </div>

      {errorMessage && (
        <div className="mt-4 rounded-lg bg-red-50 p-3 text-center text-sm text-red-600">⚠️ {errorMessage}</div>
      )}
    </section>
  );
}

interface RangeModalProps {
  open: boolean;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  parsedPages: number[] | null;
  pageCount: number;
  errorMessage: string | null;
  loading: boolean;
}

function RangeModal({ open, value, onChange, onClose, onConfirm, parsedPages, pageCount, errorMessage, loading }: RangeModalProps) {
  // Handle ESC key to close modal
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, loading, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="range-modal-title">
        <div className="flex items-center justify-between">
          <div>
            <h3 id="range-modal-title" className="text-lg font-semibold text-gray-900">생성할 페이지 범위</h3>
            <p className="mt-1 text-sm text-gray-500">예: 1,3,5 또는 2-4 (입력하지 않으면 전체 페이지)</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-gray-500 hover:bg-gray-100" aria-label="닫기">
            ✕
          </button>
        </div>
        <div className="mt-6 space-y-3">
          <Input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={`전체 ${pageCount}페이지 범위 내에서 입력`}
            className="h-12 font-mono"
          />
          <p className="text-xs text-gray-500">
            {parsedPages && parsedPages.length > 0
              ? `선택된 페이지: ${parsedPages.join(', ')} (총 ${parsedPages.length}페이지)`
              : value
                ? "올바른 형식으로 입력해주세요."
                : "입력하지 않으면 전체 페이지가 생성됩니다."}
          </p>
          {errorMessage && <p className="text-xs text-red-500">{errorMessage}</p>}
        </div>
        <div className="mt-8 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} className="px-4 text-black">
            취소
          </Button>
          <Button onClick={onConfirm} disabled={loading} className="px-4">
            {loading ? "생성 중..." : "생성 시작"}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface ResultModalProps {
  open: boolean;
  loading: boolean;
  progressPercent: number;
  onClose: () => void;
  selectedFile: File | null;
  fileType: FileType;
  pages: PageData[];
  results: Record<number, string>;
  selectedLanguage: LanguageOption;
  translatedResults: Record<number, string>;
  onTranslate: () => void;
  isTranslating: boolean;
  apiKey: string;
}

function ResultModal({ open, loading, progressPercent, onClose, selectedFile, fileType, pages, results, selectedLanguage, translatedResults, onTranslate, isTranslating, apiKey }: ResultModalProps) {
  const [currentDisplayIndex, setCurrentDisplayIndex] = useState(0);
  const [copyText, setCopyText] = useState("");
  const [copyTranslatedText, setCopyTranslatedText] = useState("");
  const [isPlayingKorean, setIsPlayingKorean] = useState(false);
  const [isPlayingTranslated, setIsPlayingTranslated] = useState(false);
  const [isLoadingKorean, setIsLoadingKorean] = useState(false);
  const [isLoadingTranslated, setIsLoadingTranslated] = useState(false);
  // Store audio per page
  const [audioKoreanCache, setAudioKoreanCache] = useState<Record<number, HTMLAudioElement>>({});
  const [audioTranslatedCache, setAudioTranslatedCache] = useState<Record<number, HTMLAudioElement>>({});

  // Reset current page when modal opens
  useEffect(() => {
    if (open) {
      setCurrentDisplayIndex(0);
    }
  }, [open]);

  // Get the actual page index from the displayed pages array
  const currentPageIndex = pages[currentDisplayIndex]?.index;

  // Handle ESC key to close modal
  const handleEscKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && !loading) {
      // Stop all playing audio
      Object.values(audioKoreanCache).forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
      });
      Object.values(audioTranslatedCache).forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
      });
      setIsPlayingKorean(false);
      setIsPlayingTranslated(false);
      onClose();
    }
  };

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [open, loading, audioKoreanCache, audioTranslatedCache]);

  // Stop audio when modal closes
  useEffect(() => {
    if (!open) {
      // Stop all cached audio
      Object.values(audioKoreanCache).forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
      });
      Object.values(audioTranslatedCache).forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
      });
      setIsPlayingKorean(false);
      setIsPlayingTranslated(false);
      setAudioKoreanCache({});
      setAudioTranslatedCache({});
    }
  }, [open, audioKoreanCache, audioTranslatedCache]);

  // Preload Korean audio when copyText is available for current page
  useEffect(() => {
    if (!copyText.trim() || !open || !apiKey || currentPageIndex === undefined) return;
    if (audioKoreanCache[currentPageIndex]) return; // Already cached

    const preloadAudio = async () => {
      try {
        const response = await fetch("/api/tts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            apiKey: apiKey,
            text: copyText,
            language: "ko"
          })
        });

        if (!response.ok) return;

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        audio.onended = () => {
          setIsPlayingKorean(false);
          URL.revokeObjectURL(audioUrl);
        };

        audio.onerror = () => {
          setIsPlayingKorean(false);
          URL.revokeObjectURL(audioUrl);
        };

        // Preload the audio
        audio.load();
        setAudioKoreanCache(prev => ({ ...prev, [currentPageIndex]: audio }));
      } catch (error) {
        console.error("Preload error:", error);
      }
    };

    preloadAudio();
  }, [copyText, open, apiKey, currentPageIndex, audioKoreanCache]);

  // Preload translated audio when copyTranslatedText is available for current page
  useEffect(() => {
    if (!copyTranslatedText.trim() || !open || !apiKey || selectedLanguage === "none" || currentPageIndex === undefined) return;
    if (audioTranslatedCache[currentPageIndex]) return; // Already cached

    const langCodes: Record<LanguageOption, string> = {
      none: 'ko',
      english: 'en',
      chinese: 'zh',
      vietnamese: 'vi'
    };

    const preloadTranslatedAudio = async () => {
      try {
        const response = await fetch("/api/tts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            apiKey: apiKey,
            text: copyTranslatedText,
            language: langCodes[selectedLanguage]
          })
        });

        if (!response.ok) return;

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        audio.onended = () => {
          setIsPlayingTranslated(false);
          URL.revokeObjectURL(audioUrl);
        };

        audio.onerror = () => {
          setIsPlayingTranslated(false);
          URL.revokeObjectURL(audioUrl);
        };

        // Preload the audio
        audio.load();
        setAudioTranslatedCache(prev => ({ ...prev, [currentPageIndex]: audio }));
      } catch (error) {
        console.error("Preload translated error:", error);
      }
    };

    preloadTranslatedAudio();
  }, [copyTranslatedText, open, apiKey, selectedLanguage, currentPageIndex, audioTranslatedCache]);

  if (!open) return null;

  const percent = Math.min(100, Math.max(0, Math.round(progressPercent)));
  const panelClasses =
    "flex h-full flex-col overflow-hidden rounded-3xl border border-gray-200 bg-gray-50 shadow-inner";
  const headerClasses =
    "flex items-center justify-between border-b border-amber-200 bg-amber-50 px-6 py-4";
  const headerTitleClasses = "flex items-center gap-2 text-sm font-semibold text-amber-700";
  const headerIconClasses =
    "flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 to-amber-100 text-xs font-bold text-amber-800";

  const handleClose = () => {
    // Stop all playing audio
    Object.values(audioKoreanCache).forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    Object.values(audioTranslatedCache).forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    setIsPlayingKorean(false);
    setIsPlayingTranslated(false);

    // Call the original onClose
    onClose();
  };

  const handleCopy = () => {
    if (!copyText.trim()) return;
    void navigator.clipboard.writeText(copyText.trim());
    alert("복사되었습니다.");
  };

  const handleCopyTranslated = () => {
    if (!copyTranslatedText.trim()) return;
    void navigator.clipboard.writeText(copyTranslatedText.trim());
    const copyMessages: Record<LanguageOption, string> = {
      none: "복사되었습니다.",
      english: "Copied!",
      chinese: "已复制！",
      vietnamese: "Đã sao chép!"
    };
    alert(copyMessages[selectedLanguage]);
  };

  const handlePlayKorean = async () => {
    if (!copyText.trim() || currentPageIndex === undefined) return;

    const cachedAudio = audioKoreanCache[currentPageIndex];

    if (isPlayingKorean) {
      if (cachedAudio) {
        cachedAudio.pause();
        cachedAudio.currentTime = 0;
      }
      setIsPlayingKorean(false);
      return;
    }

    // Stop translated audio if playing
    Object.values(audioTranslatedCache).forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    setIsPlayingTranslated(false);

    try {
      // If audio is already preloaded, play it immediately
      if (cachedAudio) {
        setIsPlayingKorean(true);
        cachedAudio.currentTime = 0;
        await cachedAudio.play();
        return;
      }

      // Otherwise, load it now
      setIsLoadingKorean(true);

      const response = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          apiKey: apiKey,
          text: copyText,
          language: "ko"
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || "TTS failed");
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.onended = () => {
        setIsPlayingKorean(false);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setIsPlayingKorean(false);
        URL.revokeObjectURL(audioUrl);
      };

      setAudioKoreanCache(prev => ({ ...prev, [currentPageIndex]: audio }));
      setIsLoadingKorean(false);
      setIsPlayingKorean(true);
      await audio.play();
    } catch (error) {
      console.error("TTS error:", error);
      setIsLoadingKorean(false);
      setIsPlayingKorean(false);
      alert("음성 재생 중 오류가 발생했습니다.");
    }
  };

  const handlePlayTranslated = async () => {
    if (!copyTranslatedText.trim() || currentPageIndex === undefined) return;

    const cachedAudio = audioTranslatedCache[currentPageIndex];

    if (isPlayingTranslated) {
      if (cachedAudio) {
        cachedAudio.pause();
        cachedAudio.currentTime = 0;
      }
      setIsPlayingTranslated(false);
      return;
    }

    // Stop Korean audio if playing
    Object.values(audioKoreanCache).forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    setIsPlayingKorean(false);

    try {
      // If audio is already preloaded, play it immediately
      if (cachedAudio) {
        setIsPlayingTranslated(true);
        cachedAudio.currentTime = 0;
        await cachedAudio.play();
        return;
      }

      // Otherwise, load it now
      const langCodes: Record<LanguageOption, string> = {
        none: 'ko',
        english: 'en',
        chinese: 'zh',
        vietnamese: 'vi'
      };

      setIsLoadingTranslated(true);

      const response = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          apiKey: apiKey,
          text: copyTranslatedText,
          language: langCodes[selectedLanguage]
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || "TTS failed");
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.onended = () => {
        setIsPlayingTranslated(false);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setIsPlayingTranslated(false);
        URL.revokeObjectURL(audioUrl);
      };

      setAudioTranslatedCache(prev => ({ ...prev, [currentPageIndex]: audio }));
      setIsLoadingTranslated(false);
      setIsPlayingTranslated(true);
      await audio.play();
    } catch (error) {
      console.error("TTS error:", error);
      setIsLoadingTranslated(false);
      setIsPlayingTranslated(false);
      alert("음성 재생 중 오류가 발생했습니다.");
    }
  };

  const showTranslationPanel = selectedLanguage !== "none";

  const getCopyButtonText = (lang: LanguageOption): string => {
    const labels: Record<LanguageOption, string> = {
      none: "📋 복사하기",
      english: "📋 Copy",
      chinese: "📋 复制",
      vietnamese: "📋 Sao chép"
    };
    return labels[lang];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 sm:p-6">
      <div className={`mx-auto w-full rounded-3xl bg-white p-6 shadow-2xl ${showTranslationPanel ? 'max-w-[1600px]' : 'max-w-6xl'}`} role="dialog" aria-modal="true" aria-labelledby="result-modal-title">
        <div className="mb-4 flex items-center justify-between">
          <h3 id="result-modal-title" className="text-lg font-semibold text-gray-900">생성 완료</h3>
          <button
            onClick={handleClose}
            className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
        {loading ? (
          <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
            <p className="text-sm text-gray-600">이미지를 분석하고 화법을 정리하고 있어요.</p>
            <div className="h-2 w-full max-w-md overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="text-xs text-gray-500">{percent}%</p>
          </div>
        ) : (
          <>
            <div className={`grid h-[80vh] gap-6 overflow-hidden ${showTranslationPanel ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>
              <div className={panelClasses}>
                <div className={headerClasses}>
                  <div className={headerTitleClasses}>
                    <span className={headerIconClasses}>원</span>
                    <span>원본 미리보기</span>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-6">
                  <PreviewPanel selectedFile={selectedFile} fileType={fileType} pages={pages} currentPageIndex={currentPageIndex} />
                </div>
              </div>
              <div className={panelClasses}>
                <div className={headerClasses}>
                  <div className={headerTitleClasses}>
                    <span className={headerIconClasses}>결</span>
                    <span>생성결과(한글)</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handlePlayKorean}
                      disabled={!copyText || isLoadingKorean}
                      className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="화법 읽기"
                    >
                      {isLoadingKorean ? "⏳ 로딩중..." : isPlayingKorean ? "⏸ 정지" : "▶ 재생"}
                    </button>
                    <button
                      onClick={handleCopy}
                      disabled={!copyText}
                      className="inline-flex items-center justify-center rounded-md border border-gray-400 bg-white px-4 py-2 text-xs font-semibold text-gray-400 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="생성 결과 복사하기"
                    >
                      📋 복사하기
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-6">
                  <ResultPanel results={results} pages={pages} onCopyTextChange={setCopyText} currentPageIndex={currentPageIndex} />
                </div>
              </div>
              {showTranslationPanel && (
                <div className={panelClasses}>
                  <div className={headerClasses}>
                    <div className={headerTitleClasses}>
                      <span className={headerIconClasses}>외</span>
                      <span>생성결과({LANGUAGE_LABELS[selectedLanguage]})</span>
                    </div>
                    <div className="flex gap-2">
                      {Object.keys(translatedResults).length === 0 && (
                        <button
                          onClick={onTranslate}
                          disabled={isTranslating}
                          className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label="번역하기"
                        >
                          {isTranslating ? "번역 중..." : "번역하기"}
                        </button>
                      )}
                      {Object.keys(translatedResults).length > 0 && (
                        <button
                          onClick={handlePlayTranslated}
                          disabled={!copyTranslatedText || isLoadingTranslated}
                          className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label="번역 읽기"
                        >
                          {isLoadingTranslated ? "⏳ 로딩중..." : isPlayingTranslated ? "⏸ 정지" : "▶ 재생"}
                        </button>
                      )}
                      <button
                        onClick={handleCopyTranslated}
                        disabled={!copyTranslatedText}
                        className="inline-flex items-center justify-center rounded-md border border-gray-400 bg-white px-4 py-2 text-xs font-semibold text-gray-400 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="번역 결과 복사하기"
                      >
                        {getCopyButtonText(selectedLanguage)}
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto px-6 py-6">
                    {isTranslating ? (
                      <div className="flex h-full items-center justify-center">
                        <p className="text-sm text-gray-500">번역 중입니다...</p>
                      </div>
                    ) : Object.keys(translatedResults).length === 0 ? (
                      <div className="flex h-full items-center justify-center">
                        <p className="text-sm text-gray-500">번역하기 버튼을 눌러주세요.</p>
                      </div>
                    ) : (
                      <ResultPanel results={translatedResults} pages={pages} onCopyTextChange={setCopyTranslatedText} currentPageIndex={currentPageIndex} />
                    )}
                  </div>
                </div>
              )}
            </div>
            {pages.length > 1 && (
              <div className="mt-4 flex items-center justify-center gap-4">
                <button
                  onClick={() => setCurrentDisplayIndex(Math.max(0, currentDisplayIndex - 1))}
                  disabled={currentDisplayIndex === 0}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                  aria-label="이전 페이지"
                >
                  ←
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">페이지</span>
                  <input
                    type="number"
                    min="1"
                    max={pages.length}
                    value={currentDisplayIndex + 1}
                    onChange={(e) => {
                      const page = parseInt(e.target.value, 10) - 1;
                      if (page >= 0 && page < pages.length) {
                        setCurrentDisplayIndex(page);
                      }
                    }}
                    className="w-16 rounded border border-gray-300 px-2 py-1 text-center text-sm"
                  />
                  <span className="text-sm text-gray-500">/ {pages.length}</span>
                </div>
                <button
                  onClick={() => setCurrentDisplayIndex(Math.min(pages.length - 1, currentDisplayIndex + 1))}
                  disabled={currentDisplayIndex === pages.length - 1}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                  aria-label="다음 페이지"
                >
                  →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function HomePage() {
  const [topic, setTopic] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageOption>("none");
  // Fixed generation options - can be made configurable in future
  const FIXED_LENGTH: LengthOption = DEFAULT_LENGTH;
  const FIXED_DELIVERY: DeliveryStyleOption = DEFAULT_DELIVERY;
  const FIXED_TONE: ToneOption = DEFAULT_TONE;

  const apiKey = useApiKey();
  const filePreview = useFilePreview();
  const fileProcessor = useFileProcessor();
  const generation = useGeneration(topic, FIXED_LENGTH, FIXED_TONE, FIXED_DELIVERY, apiKey.apiKey);

  const {
    pages,
    parsing,
    ocrProgress,
    errorMessage: fileError,
    dragActive,
    handleFileInput,
    handleDrag,
    handleDrop
  } = fileProcessor;
  const {
    batchLoading,
    errorMessage: generationError,
    generateAllPages,
    results,
    resetResults,
    generationProgress,
    totalPages,
    costSummary
  } = generation;

  const isPdf = filePreview.fileType === "pdf";
  const errorMessage = fileError || generationError;

  // Convert USD cost to KRW (approximate exchange rate: 1 USD = 1350 KRW)
  const USD_TO_KRW = 1350;
  const totalCostKRW = costSummary ? costSummary.totalCost * USD_TO_KRW : undefined;

  const [rangeModalOpen, setRangeModalOpen] = useState(false);
  const [rangeDraft, setRangeDraft] = useState("");
  const [rangeError, setRangeError] = useState<string | null>(null);
  const rangeDraftParsed = useMemo(() => parsePageInput(rangeDraft, pages.length), [rangeDraft, pages.length]);

  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [resultModalLoading, setResultModalLoading] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [translatedResults, setTranslatedResults] = useState<Record<number, string>>({});
  const [isTranslating, setIsTranslating] = useState(false);
  const [displayedPages, setDisplayedPages] = useState<PageData[]>([]);

  // Use custom hook for smooth progress display with automatic cleanup
  const progressDisplay = useProgressDisplay({
    isLoading: resultModalLoading,
    actualProgress: generationProgress,
    totalItems: totalPages
  });

  useEffect(() => {
    if (rangeModalOpen || resultModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [rangeModalOpen, resultModalOpen]);

  const handleFileChange = (input: HTMLInputElement) => {
    const file = input.files?.[0];
    if (file) {
      filePreview.handleFileSelection(file);
      handleFileInput(input);
    }
  };

  const handleFileDropWrapper = async (event: React.DragEvent) => {
    await handleDrop(event);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      filePreview.handleFileSelection(file);
    }
  };

  const openResultModalWithLoading = () => {
    setResultModalLoading(true);
    setResultModalOpen(true);
  };

  const finishResultModalLoading = () => {
    setResultModalLoading(false);
  };

  const runGeneration = async (targetPages: PageData[]) => {
    if (!targetPages.length) {
      setRangeError("선택한 페이지를 찾을 수 없습니다.");
      return;
    }

    setDisplayedPages(targetPages);
    openResultModalWithLoading();
    try {
      await generateAllPages(targetPages);
      filePreview.setShowPreview(true);
      setHasResult(true);
    } catch (error) {
      setHasResult(false);
      setResultModalOpen(false);
      throw error;
    } finally {
      finishResultModalLoading();
    }
  };

  const handleGenerateAll = async () => {
    await runGeneration(pages);
  };

  const openRangeModal = () => {
    setRangeDraft(filePreview.pageInput || "");
    setRangeError(null);
    setRangeModalOpen(true);
  };

  const closeRangeModal = () => {
    setRangeModalOpen(false);
  };

  const confirmRangeAndGenerate = async () => {
    const parsed = parsePageInput(rangeDraft, pages.length);
    if (!parsed || parsed.length === 0) {
      setRangeError("유효한 페이지 범위를 입력해주세요.");
      return;
    }

    const selectedPages = parsed
      .map((pageNumber) => pages.find((page) => page.index === pageNumber - 1))
      .filter((page): page is PageData => page !== undefined);

    setRangeModalOpen(false);
    setRangeError(null);
    filePreview.setPageInput(rangeDraft);
    await runGeneration(selectedPages);
  };

  const handleTranslate = async () => {
    if (selectedLanguage === "none" || Object.keys(results).length === 0) return;

    setIsTranslating(true);
    const translated: Record<number, string> = {};

    try {
      for (const [pageIndex, content] of Object.entries(results)) {
        const response = await fetch("/api/translate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            apiKey: apiKey.apiKey,
            content,
            targetLanguage: selectedLanguage,
            context: topic
          })
        });

        if (!response.ok) {
          throw new Error("Translation failed");
        }

        const data = await response.json();
        translated[Number(pageIndex)] = data.translatedContent;
      }

      setTranslatedResults(translated);
    } catch (error) {
      console.error("Translation error:", error);
      alert("번역 중 오류가 발생했습니다.");
    } finally {
      setIsTranslating(false);
    }
  };

  const handleReset = () => {
    filePreview.reset();
    fileProcessor.resetPages();
    resetResults();
    setTopic("");
    setRangeDraft("");
    setRangeError(null);
    setRangeModalOpen(false);
    setResultModalOpen(false);
    setResultModalLoading(false);
    setHasResult(false);
    setTranslatedResults({});
    setIsTranslating(false);
  };

  const handleTitleClick = () => {
    handleReset();
  };

  const handleCloseResultModal = () => {
    if (resultModalLoading) return;
    setResultModalOpen(false);
    setResultModalLoading(false);
  };

  const handleOpenLastResult = () => {
    if (!hasResult) return;
    setResultModalLoading(false);
    setResultModalOpen(true);
  };

  const progressPercent = resultModalLoading ? progressDisplay : 100;

  if (!apiKey.hasApiKey) {
    return (
      <ApiKeyScreen
        apiKeyInput={apiKey.apiKeyInput}
        onApiKeyInputChange={apiKey.setApiKeyInput}
        onSave={apiKey.saveApiKey}
      />
    );
  }

  if (!filePreview.selectedFile || pages.length === 0) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <Header
          showApiSettings={apiKey.showSettings}
          apiKeyInput={apiKey.apiKeyInput}
          onToggleSettings={() => apiKey.setShowSettings(!apiKey.showSettings)}
          onApiKeyInputChange={apiKey.setApiKeyInput}
          onSaveApiKey={apiKey.saveApiKey}
          onRemoveApiKey={apiKey.removeApiKey}
          onTitleClick={handleTitleClick}
          totalCostKRW={totalCostKRW}
        />

        <main className="flex flex-1 items-center justify-center p-6">
          <Card className="w-full max-w-3xl border-0 shadow-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">파일 불러오기</CardTitle>
              <p className="text-sm text-gray-500">PDF 또는 이미지 파일(JPG, PNG)을 업로드하세요.</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <FileUploadZone
                dragActive={dragActive}
                parsing={parsing}
                ocrProgress={ocrProgress}
                selectedFile={filePreview.selectedFile}
                errorMessage={errorMessage}
                onDrag={handleDrag}
                onDrop={handleFileDropWrapper}
                onFileSelect={handleFileChange}
              />
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-gray-50 to-white">
      <Header
        showApiSettings={apiKey.showSettings}
        apiKeyInput={apiKey.apiKeyInput}
        onToggleSettings={() => apiKey.setShowSettings(!apiKey.showSettings)}
        onApiKeyInputChange={apiKey.setApiKeyInput}
        onSaveApiKey={apiKey.saveApiKey}
        onRemoveApiKey={apiKey.removeApiKey}
        onTitleClick={handleTitleClick}
        totalCostKRW={totalCostKRW}
      />

      <main className="flex flex-1 flex-col items-center justify-center p-6">
        <div className="w-full max-w-3xl space-y-6">
          <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">주제 (상품명)</label>
              <Input
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder="예: 한화생명 퍼스트케어 암보험"
                disabled={batchLoading || parsing}
                className="h-12 border-gray-300 text-sm"
              />
              {filePreview.selectedFile?.name && (
                <p className="mt-2 text-xs text-gray-400">
                  {filePreview.selectedFile.name} · {pages.length}페이지
                </p>
              )}
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">외국어</label>
              <select
                value={selectedLanguage}
                onChange={(event) => setSelectedLanguage(event.target.value as LanguageOption)}
                disabled={batchLoading || parsing}
                className="h-12 w-full rounded-md border border-gray-300 bg-white px-3 text-sm shadow-sm transition-colors hover:bg-gray-50 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100"
              >
                {(Object.keys(LANGUAGE_LABELS) as LanguageOption[]).map((lang) => (
                  <option key={lang} value={lang}>
                    {LANGUAGE_LABELS[lang]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {hasResult && (
            <div className="flex justify-end">
              <button
                onClick={handleOpenLastResult}
                className="text-xs text-purple-600 underline hover:text-purple-700"
              >
                최근 생성 결과 다시 보기
              </button>
            </div>
          )}
          <OptionActionsCard
            disabled={batchLoading || parsing}
            pageCount={pages.length}
            isPdf={isPdf}
            onGenerateAll={handleGenerateAll}
            onOpenRangeModal={openRangeModal}
            hasResult={hasResult}
            onOpenLastResult={handleOpenLastResult}
            errorMessage={errorMessage}
          />
        </div>
      </main>

      <RangeModal
        open={rangeModalOpen}
        value={rangeDraft}
        onChange={setRangeDraft}
        onClose={closeRangeModal}
        onConfirm={confirmRangeAndGenerate}
        parsedPages={rangeDraftParsed}
        pageCount={pages.length}
        errorMessage={rangeError}
        loading={batchLoading}
      />

      <ResultModal
        open={resultModalOpen}
        loading={resultModalLoading}
        progressPercent={progressPercent}
        onClose={handleCloseResultModal}
        selectedFile={filePreview.selectedFile}
        fileType={filePreview.fileType}
        pages={displayedPages.length > 0 ? displayedPages : pages}
        results={results}
        selectedLanguage={selectedLanguage}
        translatedResults={translatedResults}
        onTranslate={handleTranslate}
        isTranslating={isTranslating}
        apiKey={apiKey.apiKey}
      />
    </div>
  );
}
