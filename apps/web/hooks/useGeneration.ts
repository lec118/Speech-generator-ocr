import { useState, useCallback } from "react";
import type {
  PageData,
  GenerateResponse,
  LengthOption,
  ToneOption,
  UsageSummary,
  CostSummary
} from "@repo/core";

export interface UseGenerationReturn {
  results: Record<number, string>;
  loadingPage: number | null;
  batchLoading: boolean;
  errorMessage: string | null;
  usageSummary: UsageSummary | null;
  costSummary: CostSummary | null;
  generateForPage: (page: PageData) => Promise<void>;
  generateAllPages: (pages: PageData[]) => Promise<void>;
  resetResults: () => void;
}

/**
 * Custom hook for managing TTS speech generation
 */
export function useGeneration(
  topic: string,
  length: LengthOption,
  tone: ToneOption,
  apiKey: string
): UseGenerationReturn {
  const [results, setResults] = useState<Record<number, string>>({});
  const [loadingPage, setLoadingPage] = useState<number | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
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
          pageText: page.text
        })),
        options: { length, tone }
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error ?? "생성 중 오류가 발생했습니다.");
    }

    return await response.json();
  }, [apiKey, topic, length, tone]);

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
      setErrorMessage(
        error instanceof Error ? error.message : "생성 요청이 실패했습니다."
      );
    } finally {
      setLoadingPage(null);
    }
  }, [requestGeneration]);

  const generateAllPages = useCallback(async (pages: PageData[]) => {
    setBatchLoading(true);
    setErrorMessage(null);

    try {
      const { outputs, usage, cost } = await requestGeneration(pages);
      const merged: Record<number, string> = {};

      outputs.forEach((item) => {
        merged[item.pageIndex] = item.content;
      });

      setResults(merged);
      setUsageSummary(usage);
      setCostSummary(cost);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : "일괄 생성 중 문제가 발생했습니다."
      );
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
    errorMessage,
    usageSummary,
    costSummary,
    generateForPage,
    generateAllPages,
    resetResults
  };
}
