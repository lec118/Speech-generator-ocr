import { useState, useCallback } from "react";
import type { PageData } from "@repo/core";
import { processFile, validatePages } from "../lib/file-processing";

export interface UseFileProcessorReturn {
  pages: PageData[];
  parsing: boolean;
  ocrProgress: number;
  errorMessage: string | null;
  dragActive: boolean;
  handleFileInput: (input: HTMLInputElement) => Promise<void>;
  handleDrag: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => Promise<void>;
  resetPages: () => void;
}

/**
 * Custom hook for file processing (PDF and images)
 */
export function useFileProcessor(
  onPagesExtracted?: (pages: PageData[]) => void
): UseFileProcessorReturn {
  const [pages, setPages] = useState<PageData[]>([]);
  const [parsing, setParsing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const processFileInternal = useCallback(async (file: File) => {
    setParsing(true);
    setErrorMessage(null);
    setOcrProgress(0);

    try {
      const extracted = await processFile(file, setOcrProgress);
      validatePages(extracted);

      setPages(extracted);
      onPagesExtracted?.(extracted);
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : '파일 처리 중 오류가 발생했습니다.');
      setPages([]);
    } finally {
      setParsing(false);
      setOcrProgress(0);
    }
  }, [onPagesExtracted]);

  const handleFileInput = useCallback(async (input: HTMLInputElement) => {
    const file = input.files?.[0];
    if (!file) return;
    await processFileInternal(file);
    input.value = '';
  }, [processFileInternal]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await processFileInternal(file);
  }, [processFileInternal]);

  const resetPages = useCallback(() => {
    setPages([]);
    setErrorMessage(null);
    setOcrProgress(0);
  }, []);

  return {
    pages,
    parsing,
    ocrProgress,
    errorMessage,
    dragActive,
    handleFileInput,
    handleDrag,
    handleDrop,
    resetPages
  };
}
