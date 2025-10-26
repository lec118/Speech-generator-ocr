import { useState, useCallback } from "react";
import type {
  CostSummary,
  DeliveryStyleOption,
  GenerateResponse,
  LengthOption,
  PageData,
  PageError,
  ToneOption,
  UsageSummary
} from "@repo/core";

export interface UseGenerationReturn {
  results: Record<number, string>;
  loadingPage: number | null;
  batchLoading: boolean;
  generationProgress: number;
  totalPages: number;
  errorMessage: string | null;
  pageErrors: PageError[];
  usageSummary: UsageSummary | null;
  costSummary: CostSummary | null;
  generateForPage: (page: PageData) => Promise<void>;
  generateAllPages: (pages: PageData[]) => Promise<void>;
  resetResults: () => void;
}

const ERROR_SINGLE_REQUEST = "생성 요청 중 오류가 발생했습니다.";
const ERROR_SINGLE_PAGE = "선택한 페이지 생성이 실패했습니다.";
const ERROR_BATCH = "일괄 생성 중 문제가 발생했습니다.";
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

/**
 * Delay utility for retries
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Custom hook for managing TTS speech generation
 */
export function useGeneration(
  topic: string,
  length: LengthOption,
  tone: ToneOption,
  delivery: DeliveryStyleOption,
  apiKey: string
): UseGenerationReturn {
  const [results, setResults] = useState<Record<number, string>>({});
  const [loadingPage, setLoadingPage] = useState<number | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pageErrors, setPageErrors] = useState<PageError[]>([]);
  const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(null);
  const [costSummary, setCostSummary] = useState<CostSummary | null>(null);

  const requestGeneration = useCallback(async (targetPages: PageData[], retryCount = 0): Promise<GenerateResponse> => {
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey,
          topic,
          pages: targetPages.map((page) => ({
            pageIndex: page.index,
            imageDataUrl: page.imageDataUrl
          })),
          options: { length, tone, delivery }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({} as { error?: string }));
        throw new Error(errorData.error ?? ERROR_SINGLE_REQUEST);
      }

      return await response.json();
    } catch (error) {
      // Retry logic for network errors
      if (retryCount < MAX_RETRIES) {
        console.warn(`Request failed, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
        await delay(RETRY_DELAY_MS * (retryCount + 1)); // Exponential backoff
        return requestGeneration(targetPages, retryCount + 1);
      }
      throw error;
    }
  }, [apiKey, topic, length, tone, delivery]);

  const generateForPage = useCallback(async (page: PageData) => {
    setLoadingPage(page.index);
    setErrorMessage(null);
    setPageErrors([]);

    try {
      const { outputs, errors, usage, cost } = await requestGeneration([page]);

      if (outputs.length > 0) {
        const [result] = outputs;
        setResults((prev) => ({ ...prev, [result.pageIndex]: result.content }));
      }

      if (errors && errors.length > 0) {
        setPageErrors(errors);
        setErrorMessage(`페이지 ${page.index + 1} 생성 실패: ${errors[0].error}`);
      }

      setUsageSummary(usage);
      setCostSummary(cost);
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : ERROR_SINGLE_PAGE);
      setPageErrors([{ pageIndex: page.index, error: error instanceof Error ? error.message : ERROR_SINGLE_PAGE }]);
    } finally {
      setLoadingPage(null);
    }
  }, [requestGeneration]);

  const generateAllPages = useCallback(async (pages: PageData[]) => {
    setBatchLoading(true);
    setErrorMessage(null);
    setPageErrors([]);
    setTotalPages(pages.length);
    setGenerationProgress(0);

    try {
      const merged: Record<number, string> = {};
      const allErrors: PageError[] = [];
      let accumulatedUsage: UsageSummary | null = null;
      let accumulatedCost: CostSummary | null = null;

      // Process pages one by one to avoid rate limits and handle errors gracefully
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];

        try {
          const { outputs, errors, usage, cost } = await requestGeneration([page]);

          // Collect successful outputs
          if (outputs.length > 0) {
            outputs.forEach((item) => {
              merged[item.pageIndex] = item.content;
            });
          }

          // Collect errors
          if (errors && errors.length > 0) {
            allErrors.push(...errors);
          }

          // Accumulate usage
          if (usage) {
            accumulatedUsage = accumulatedUsage
              ? {
                  promptTokens: accumulatedUsage.promptTokens + usage.promptTokens,
                  completionTokens: accumulatedUsage.completionTokens + usage.completionTokens,
                  totalTokens: accumulatedUsage.totalTokens + usage.totalTokens
                }
              : { ...usage };
          }

          // Accumulate cost
          if (cost) {
            accumulatedCost = accumulatedCost
              ? {
                  inputCost: accumulatedCost.inputCost + cost.inputCost,
                  outputCost: accumulatedCost.outputCost + cost.outputCost,
                  totalCost: accumulatedCost.totalCost + cost.totalCost
                }
              : { ...cost };
          }
        } catch (error) {
          console.error(`Error processing page ${page.index + 1}:`, error);
          allErrors.push({
            pageIndex: page.index,
            error: error instanceof Error ? error.message : "Unknown error"
          });
        }

        // Update progress and results after each page
        setResults({ ...merged });
        setGenerationProgress(i + 1);
        setPageErrors([...allErrors]);
      }

      setUsageSummary(accumulatedUsage);
      setCostSummary(accumulatedCost);

      // Set summary error message if there were any failures
      if (allErrors.length > 0) {
        const successCount = pages.length - allErrors.length;
        if (successCount === 0) {
          setErrorMessage("모든 페이지 생성에 실패했습니다.");
        } else {
          setErrorMessage(`${allErrors.length}개 페이지 생성 실패 (${successCount}/${pages.length} 성공)`);
        }
      }
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : ERROR_BATCH);
    } finally {
      setBatchLoading(false);
    }
  }, [requestGeneration]);

  const resetResults = useCallback(() => {
    setResults({});
    setUsageSummary(null);
    setCostSummary(null);
    setErrorMessage(null);
    setPageErrors([]);
  }, []);

  return {
    results,
    loadingPage,
    batchLoading,
    generationProgress,
    totalPages,
    errorMessage,
    pageErrors,
    usageSummary,
    costSummary,
    generateForPage,
    generateAllPages,
    resetResults
  };
}
