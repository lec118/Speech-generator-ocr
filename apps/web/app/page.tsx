"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, Input } from "@repo/ui";
import type { DeliveryStyleOption, LengthOption, PageData, ToneOption, LanguageOption } from "@repo/core";
import { LANGUAGE_LABELS } from "@repo/core";
import { ApiKeyScreen } from "../components/ApiKeyScreen";
import { Header } from "../components/Header";
import { FileUploadZone } from "../components/FileUploadZone";
import { OptionActionsCard } from "../components/OptionActionsCard";
import { RangeModal } from "../components/RangeModal";
import { ResultModal } from "../components/ResultModal";
import { useApiKey } from "../hooks/useApiKey";
import { useFilePreview } from "../hooks/useFilePreview";
import { useFileProcessor } from "../hooks/useFileProcessor";
import { useGeneration, isGenerationCancelledError } from "../hooks/useGeneration";
import { useProgressDisplay } from "../hooks/useProgressDisplay";
import { parsePageInput } from "../lib/page-parser";

const DEFAULT_LENGTH: LengthOption = "standard";
const DEFAULT_DELIVERY: DeliveryStyleOption = "empathy";
const DEFAULT_TONE: ToneOption = "friendly";
const FILE_UPLOAD_INPUT_ID = "file-upload-input";

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
    pageErrors,
    generateAllPages,
    cancelGeneration,
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

  // Estimate cost based on page count (before generation)
  // Average: ~2500 input tokens per page (image + prompt), ~600 output tokens
  // Input: $0.00015/1K, Output: $0.0006/1K
  const estimatedCostPerPage = ((2500 / 1000) * 0.00015) + ((600 / 1000) * 0.0006); // ~$0.00074 per page
  const estimatedTotalCostKRW = pages.length > 0 ? Math.ceil(pages.length * estimatedCostPerPage * USD_TO_KRW) : undefined;

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

  const openFilePicker = () => {
    const input = document.getElementById(FILE_UPLOAD_INPUT_ID) as HTMLInputElement | null;
    if (input) {
      input.value = "";
      input.click();
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
      setResultModalOpen(false);
      if (isGenerationCancelledError(error)) {
        return;
      }
      setHasResult(false);
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
    if (resultModalLoading) {
      cancelGeneration();
    }
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
          estimatedCostKRW={estimatedTotalCostKRW}
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
                fileInputId={FILE_UPLOAD_INPUT_ID}
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
        estimatedCostKRW={estimatedTotalCostKRW}
      />

      <main className="flex flex-1 flex-col items-center justify-center p-6">
        <div className="w-full max-w-3xl space-y-6">
          {/* Hidden file input */}
          <input
            id={FILE_UPLOAD_INPUT_ID}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(event) => {
              if (event.target) {
                handleFileChange(event.target);
              }
            }}
          />

          <div className="space-y-4">
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
            <div className="flex justify-end">
              <button
                type="button"
                onClick={openFilePicker}
                disabled={batchLoading || parsing}
                className="inline-flex items-center justify-center gap-2 rounded-md border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 px-4 py-2.5 text-sm font-semibold text-purple-700 transition-all hover:border-purple-300 hover:from-purple-100 hover:to-indigo-100 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed disabled:border-gray-200 disabled:from-gray-50 disabled:to-gray-50 disabled:text-gray-400"
              >
                <span>📁</span>
                <span>다른 파일 찾기</span>
              </button>
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
        onCancel={cancelGeneration}
        selectedFile={filePreview.selectedFile}
        fileType={filePreview.fileType}
        pages={displayedPages.length > 0 ? displayedPages : pages}
        results={results}
        pageErrors={pageErrors}
        selectedLanguage={selectedLanguage}
        translatedResults={translatedResults}
        onTranslate={handleTranslate}
        isTranslating={isTranslating}
        apiKey={apiKey.apiKey}
      />
    </div>
  );
}
