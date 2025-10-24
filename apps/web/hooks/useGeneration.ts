import { useState, useCallback } from "react";
import type {
  CostSummary,
  DeliveryStyleOption,
  GenerateResponse,
  LengthOption,
  PageData,
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
  usageSummary: UsageSummary | null;
  costSummary: CostSummary | null;
  generateForPage: (page: PageData) => Promise<void>;
  generateAllPages: (pages: PageData[]) => Promise<void>;
  resetResults: () => void;
}

const ERROR_SINGLE_REQUEST = "생성 요청 중 오류가 발생했습니다.";
const ERROR_SINGLE_PAGE = "선택한 페이지 생성이 실패했습니다.";
const ERROR_BATCH = "일괄 생성 중 문제가 발생했습니다.";

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
  const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(null);
  const [costSummary, setCostSummary] = useState<CostSummary | null>(null);

  const requestGeneration = useCallback(async (targetPages: PageData[]): Promise<GenerateResponse> => {
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
      const error = await response.json().catch(() => ({} as { error?: string }));
      throw new Error(error.error ?? ERROR_SINGLE_REQUEST);
    }

    return await response.json();
  }, [apiKey, topic, length, tone, delivery]);

  const generateForPage = useCallback(async (page: PageData) => {
    setLoadingPage(page.index);
    setErrorMessage(null);

    try {
      const { outputs, usage, cost } = await requestGeneration([page]);
      const [result] = outputs;

      if (result) {
        setResults((prev) => ({ ...prev, [result.pageIndex]: result.content }));
      }

      setUsageSummary(usage);
      setCostSummary(cost);
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : ERROR_SINGLE_PAGE);
    } finally {
      setLoadingPage(null);
    }
  }, [requestGeneration]);

  const generateAllPages = useCallback(async (pages: PageData[]) => {
    setBatchLoading(true);
    setErrorMessage(null);
    setTotalPages(pages.length);
    setGenerationProgress(0);

    try {
      const merged: Record<number, string> = {};
      let accumulatedUsage: UsageSummary | null = null;
      let accumulatedCost: CostSummary | null = null;

      // Batch size for parallel processing (adjust based on API rate limits)
      const BATCH_SIZE = 3;
      const MAX_RETRIES = 3;
      const BATCH_DELAY_MS = 1000; // Delay between batches to avoid rate limits

      // Helper function to retry a single page generation
      const generateWithRetry = async (page: PageData, retries = MAX_RETRIES): Promise<GenerateResponse | null> => {
        for (let attempt = 0; attempt < retries; attempt++) {
          try {
            return await requestGeneration([page]);
          } catch (error) {
            console.warn(`Page ${page.index + 1} failed (attempt ${attempt + 1}/${retries}):`, error);
            if (attempt < retries - 1) {
              // Exponential backoff: 1s, 2s, 4s
              await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
            }
          }
        }
        return null;
      };

      // Helper function to delay between batches
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      for (let i = 0; i < pages.length; i += BATCH_SIZE) {
        const batch = pages.slice(i, i + BATCH_SIZE);
        const batchStartTime = Date.now();

        // Process batch in parallel with retry logic using allSettled
        const batchResults = await Promise.allSettled(
          batch.map(page => generateWithRetry(page))
        );

        // Merge results from batch, handling both successes and failures
        let batchSuccessCount = 0;
        let batchFailureCount = 0;

        batchResults.forEach((result, idx) => {
          if (result.status === 'fulfilled' && result.value) {
            const { outputs, usage, cost } = result.value;
            outputs.forEach((item) => {
              merged[item.pageIndex] = item.content;
            });

            if (usage) {
              accumulatedUsage = accumulatedUsage
                ? {
                    promptTokens: accumulatedUsage.promptTokens + usage.promptTokens,
                    completionTokens: accumulatedUsage.completionTokens + usage.completionTokens,
                    totalTokens: accumulatedUsage.totalTokens + usage.totalTokens
                  }
                : { ...usage };
            }

            if (cost) {
              accumulatedCost = accumulatedCost
                ? {
                    inputCost: accumulatedCost.inputCost + cost.inputCost,
                    outputCost: accumulatedCost.outputCost + cost.outputCost,
                    totalCost: accumulatedCost.totalCost + cost.totalCost
                  }
                : { ...cost };
            }

            batchSuccessCount++;
          } else {
            const pageIndex = batch[idx].index;
            console.error(`Failed to generate page ${pageIndex + 1} after all retries`);
            batchFailureCount++;
          }
        });

        // Update results immediately after each batch
        setResults({ ...merged });

        // Calculate progress based on actual time elapsed and completed pages
        const completedPages = i + batch.length;
        setGenerationProgress(completedPages);

        // Add delay between batches (except for the last batch)
        if (i + BATCH_SIZE < pages.length) {
          const batchElapsed = Date.now() - batchStartTime;
          const remainingDelay = Math.max(0, BATCH_DELAY_MS - batchElapsed);
          if (remainingDelay > 0) {
            await delay(remainingDelay);
          }
        }

        // If any pages failed, warn the user
        if (batchFailureCount > 0) {
          console.warn(`Batch completed with ${batchFailureCount} failure(s) and ${batchSuccessCount} success(es)`);
        }
      }

      setUsageSummary(accumulatedUsage);
      setCostSummary(accumulatedCost);

      // Check if any pages failed completely
      const failedPages = pages.filter(page => !merged[page.index]);
      if (failedPages.length > 0) {
        const failedPageNumbers = failedPages.map(p => p.index + 1).join(', ');
        setErrorMessage(`일부 페이지 생성 실패: ${failedPageNumbers}번 페이지. 나머지 ${pages.length - failedPages.length}개 페이지는 성공했습니다.`);
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
  }, []);

  return {
    results,
    loadingPage,
    batchLoading,
    generationProgress,
    totalPages,
    errorMessage,
    usageSummary,
    costSummary,
    generateForPage,
    generateAllPages,
    resetResults
  };
}
