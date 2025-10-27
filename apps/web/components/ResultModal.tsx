import { useCallback, useEffect, useState } from "react";
import type { LanguageOption, PageData, PageError } from "@repo/core";
import type { FileType } from "../hooks/useFilePreview";
import { PreviewPanel } from "./PreviewPanel";
import { ResultPanel } from "./ResultPanel";
import { getCopyButtonText, getCopySuccessMessage, getLanguageLabel, LANGUAGE_TO_TTS_CODE } from "../lib/language-utils";
import { useAudioPlayer } from "../hooks/useAudioPlayer";

export interface ResultModalProps {
  open: boolean;
  loading: boolean;
  progressPercent: number;
  onClose: () => void;
  onCancel?: () => void;
  selectedFile: File | null;
  fileType: FileType;
  pages: PageData[];
  results: Record<number, string>;
  pageErrors?: PageError[];
  selectedLanguage: LanguageOption;
  translatedResults: Record<number, string>;
  onTranslate: () => void;
  isTranslating: boolean;
  apiKey: string;
}

export function ResultModal({
  open,
  loading,
  progressPercent,
  onClose,
  onCancel,
  selectedFile,
  fileType,
  pages,
  results,
  pageErrors = [],
  selectedLanguage,
  translatedResults,
  onTranslate,
  isTranslating,
  apiKey
}: ResultModalProps) {
  const [currentDisplayIndex, setCurrentDisplayIndex] = useState(0);
  const [copyText, setCopyText] = useState("");
  const [copyTranslatedText, setCopyTranslatedText] = useState("");

  // Audio players for Korean and translated content
  const koreanAudio = useAudioPlayer({
    apiKey,
    language: "ko",
    enabled: open && Boolean(apiKey)
  });

  const translatedAudio = useAudioPlayer({
    apiKey,
    language: LANGUAGE_TO_TTS_CODE[selectedLanguage],
    enabled: open && Boolean(apiKey) && selectedLanguage !== "none"
  });

  // Reset current page when modal opens
  useEffect(() => {
    if (open) {
      setCurrentDisplayIndex(0);
    }
  }, [open]);

  // Get the actual page index from the displayed pages array
  const currentPageIndex = pages[currentDisplayIndex]?.index;

  // Handle close modal with cleanup
  const handleClose = useCallback(() => {
    // If loading, cancel generation first
    if (loading && onCancel) {
      onCancel();
    }
    koreanAudio.stop();
    translatedAudio.stop();
    onClose();
  }, [loading, onCancel, koreanAudio, translatedAudio, onClose]);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) {
        handleClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, loading, handleClose]);

  // Clean up audio when modal closes
  useEffect(() => {
    if (!open) {
      koreanAudio.cleanup();
      translatedAudio.cleanup();
    }
  }, [open, koreanAudio, translatedAudio]);

  if (!open) return null;

  const percent = Math.min(100, Math.max(0, Math.round(progressPercent)));
  const showTranslationPanel = selectedLanguage !== "none";

  const panelClasses = "flex h-full flex-col overflow-hidden rounded-3xl border border-gray-200 bg-gray-50 shadow-inner";
  const headerClasses = "flex items-center justify-between border-b border-amber-200 bg-amber-50 px-6 py-4";
  const headerTitleClasses = "flex items-center gap-2 text-sm font-semibold text-amber-700";
  const headerIconClasses = "flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 to-amber-100 text-xs font-bold text-amber-800";

  const handleCopy = () => {
    if (!copyText.trim()) return;
    void navigator.clipboard.writeText(copyText.trim());
    alert("복사되었습니다.");
  };

  const handleCopyTranslated = () => {
    if (!copyTranslatedText.trim()) return;
    void navigator.clipboard.writeText(copyTranslatedText.trim());
    alert(getCopySuccessMessage(selectedLanguage));
  };

  const handlePlayKorean = async () => {
    if (!copyText.trim() || currentPageIndex === undefined) return;

    // Stop translated audio if playing
    translatedAudio.stop();

    try {
      await koreanAudio.play(copyText, currentPageIndex);
    } catch (error) {
      alert("음성 재생 중 오류가 발생했습니다.");
    }
  };

  const handlePlayTranslated = async () => {
    if (!copyTranslatedText.trim() || currentPageIndex === undefined) return;

    // Stop Korean audio if playing
    koreanAudio.stop();

    try {
      await translatedAudio.play(copyTranslatedText, currentPageIndex);
    } catch (error) {
      alert("음성 재생 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 sm:p-6">
      <div
        className={`mx-auto w-full rounded-3xl bg-white p-6 shadow-2xl ${showTranslationPanel ? "max-w-[1600px]" : "max-w-6xl"}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="result-modal-title"
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 id="result-modal-title" className="text-lg font-semibold text-gray-900">
              생성 완료
            </h3>
            {pageErrors.length > 0 && !loading && (
              <p className="mt-1 text-sm text-amber-600">
                {pageErrors.length}개 페이지 생성 실패
              </p>
            )}
          </div>
          <button onClick={handleClose} className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100" aria-label="닫기">
            ✕
          </button>
        </div>
        {pageErrors.length > 0 && !loading && (
          <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 p-4">
            <div className="flex items-start gap-2">
              <span className="text-amber-600">⚠️</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800">일부 페이지 생성 실패</p>
                <ul className="mt-2 space-y-1 text-xs text-amber-700">
                  {pageErrors.map((error) => (
                    <li key={error.pageIndex}>
                      페이지 {error.pageIndex + 1}: {error.error}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
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
            <div className={`grid h-[80vh] gap-6 overflow-hidden ${showTranslationPanel ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
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
                      disabled={!copyText || koreanAudio.isLoading}
                      className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="화법 읽기"
                    >
                      {koreanAudio.isLoading ? "⏳ 로딩중..." : koreanAudio.isPlaying ? "⏸ 정지" : "▶ 재생"}
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
                      <span>생성결과({getLanguageLabel(selectedLanguage)})</span>
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
                          disabled={!copyTranslatedText || translatedAudio.isLoading}
                          className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label="번역 읽기"
                        >
                          {translatedAudio.isLoading ? "⏳ 로딩중..." : translatedAudio.isPlaying ? "⏸ 정지" : "▶ 재생"}
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
                      <ResultPanel
                        results={translatedResults}
                        pages={pages}
                        onCopyTextChange={setCopyTranslatedText}
                        currentPageIndex={currentPageIndex}
                      />
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
