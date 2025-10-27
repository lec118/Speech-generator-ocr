import { useState, useCallback, useRef } from "react";
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
  cancelGeneration: () => void;
  resetResults: () => void;
}

const ERROR_SINGLE_REQUEST = "생성 요청 중 오류가 발생했습니다.";
const ERROR_SINGLE_PAGE = "선택한 페이지 생성이 실패했습니다.";
const ERROR_BATCH = "일괄 생성 중 문제가 발생했습니다.";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;
const PAGE_DELAY_MS = 3000; // Delay between pages to avoid rate limits
const CANCELLED_ERROR_NAME = "GenerationCancelledError";

export class GenerationCancelledError extends Error {
  constructor() {
    super("Generation cancelled");
    this.name = CANCELLED_ERROR_NAME;
  }
}

export const isGenerationCancelledError = (error: unknown): error is GenerationCancelledError => {
  return error instanceof Error && error.name === CANCELLED_ERROR_NAME;
};

/**
 * Delay utility for retries
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function createDelay(ms: number, registerTimeout: (timeoutId: ReturnType<typeof setTimeout> | null) => void): Promise<void> {
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      registerTimeout(null);
      resolve();
    }, ms);
    registerTimeout(timeoutId);
  });
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
  const cancelRequestedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const pendingDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const registerDelayTimeout = useCallback((timeoutId: ReturnType<typeof setTimeout> | null) => {
    pendingDelayRef.current = timeoutId;
  }, []);

  const requestGeneration = useCallback(async (targetPages: PageData[], retryCount = 0): Promise<GenerateResponse> => {
    if (cancelRequestedRef.current) {
      throw new GenerationCancelledError();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

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
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({} as { error?: string }));
        const errorMsg = errorData.error ?? ERROR_SINGLE_REQUEST;

        // Check for rate limit error
        if (response.status === 429 || errorMsg.toLowerCase().includes("rate limit")) {
          if (retryCount < MAX_RETRIES) {
            const waitTime = RETRY_DELAY_MS * Math.pow(2, retryCount); // Exponential backoff
            console.warn(`Rate limit hit, waiting ${waitTime}ms before retry (${retryCount + 1}/${MAX_RETRIES})...`);
            await delay(waitTime);
            return requestGeneration(targetPages, retryCount + 1);
          }
        }

        throw new Error(errorMsg);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new GenerationCancelledError();
      }
      if (isGenerationCancelledError(error)) {
        throw error;
      }
      // Retry logic for network errors
      if (retryCount < MAX_RETRIES && error instanceof Error) {
        // Check if it's a network error
        if (error.message.includes("fetch") || error.message.includes("network")) {
          console.warn(`Network error, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
          await delay(RETRY_DELAY_MS * (retryCount + 1)); // Exponential backoff
          return requestGeneration(targetPages, retryCount + 1);
        }
      }
      throw error;
    } finally {
      abortControllerRef.current = null;
    }
  }, [apiKey, topic, length, tone, delivery]);

  const generateForPage = useCallback(async (page: PageData) => {
    cancelRequestedRef.current = false;
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
      if (isGenerationCancelledError(error)) {
        return;
      }
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : ERROR_SINGLE_PAGE);
      setPageErrors([{ pageIndex: page.index, error: error instanceof Error ? error.message : ERROR_SINGLE_PAGE }]);
    } finally {
      setLoadingPage(null);
      cancelRequestedRef.current = false;
      if (pendingDelayRef.current) {
        clearTimeout(pendingDelayRef.current);
        pendingDelayRef.current = null;
      }
    }
  }, [requestGeneration]);

  const generateAllPages = useCallback(async (pages: PageData[]) => {
    cancelRequestedRef.current = false;
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
        if (cancelRequestedRef.current) {
          throw new GenerationCancelledError();
        }

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
          if (isGenerationCancelledError(error)) {
            throw error;
          }
          console.error(`Error processing page ${page.index + 1}:`, error);
          allErrors.push({
            pageIndex: page.index,
            error: error instanceof Error ? error.message : "Unknown error"
          });
        }

        // Update results and errors immediately
        setResults({ ...merged });
        setPageErrors([...allErrors]);

        // Add delay between pages to avoid rate limits (except for last page)
        if (i < pages.length - 1) {
          await createDelay(PAGE_DELAY_MS, registerDelayTimeout);
          if (cancelRequestedRef.current) {
            throw new GenerationCancelledError();
          }
        }

        // Update progress AFTER delay to sync with actual timing
        setGenerationProgress(i + 1);
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
      if (isGenerationCancelledError(error)) {
        throw error;
      }
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : ERROR_BATCH);
    } finally {
      setBatchLoading(false);
      cancelRequestedRef.current = false;
      if (pendingDelayRef.current) {
        clearTimeout(pendingDelayRef.current);
        pendingDelayRef.current = null;
      }
    }
  }, [registerDelayTimeout, requestGeneration]);

  const cancelGeneration = useCallback(() => {
    cancelRequestedRef.current = true;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    if (pendingDelayRef.current) {
      clearTimeout(pendingDelayRef.current);
      pendingDelayRef.current = null;
    }
    setBatchLoading(false);
    setLoadingPage(null);
  }, []);

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
    cancelGeneration,
    resetResults
  };
}
