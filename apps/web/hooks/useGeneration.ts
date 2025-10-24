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

      for (let i = 0; i < pages.length; i += BATCH_SIZE) {
        const batch = pages.slice(i, i + BATCH_SIZE);

        // Process batch in parallel
        const batchResults = await Promise.all(
          batch.map(page => requestGeneration([page]))
        );

        // Merge results from batch
        batchResults.forEach(({ outputs, usage, cost }) => {
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
        });

        setResults({ ...merged });
        setGenerationProgress(Math.min(i + BATCH_SIZE, pages.length));
      }

      setUsageSummary(accumulatedUsage);
      setCostSummary(accumulatedCost);
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
