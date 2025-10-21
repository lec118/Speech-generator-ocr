import { useState, useEffect, useCallback } from "react";
import type { PageData } from "@repo/core";

export interface UsePageSelectionReturn {
  selectedPageIndex: number | null;
  selectedPage: PageData | null;
  setSelectedPageIndex: (index: number | null) => void;
  selectNextPage: () => void;
  selectPreviousPage: () => void;
}

/**
 * Custom hook for managing page selection state
 */
export function usePageSelection(pages: PageData[]): UsePageSelectionReturn {
  const [selectedPageIndex, setSelectedPageIndex] = useState<number | null>(null);

  // Auto-select first page when pages are loaded
  useEffect(() => {
    if (pages.length > 0 && selectedPageIndex === null) {
      setSelectedPageIndex(0);
    }
  }, [pages, selectedPageIndex]);

  // Reset selection when pages change
  useEffect(() => {
    if (pages.length === 0) {
      setSelectedPageIndex(null);
    } else if (selectedPageIndex !== null && selectedPageIndex >= pages.length) {
      setSelectedPageIndex(pages.length - 1);
    }
  }, [pages, selectedPageIndex]);

  const selectedPage = selectedPageIndex !== null ? pages[selectedPageIndex] ?? null : null;

  const selectNextPage = useCallback(() => {
    if (selectedPageIndex !== null && selectedPageIndex < pages.length - 1) {
      setSelectedPageIndex(selectedPageIndex + 1);
    }
  }, [selectedPageIndex, pages.length]);

  const selectPreviousPage = useCallback(() => {
    if (selectedPageIndex !== null && selectedPageIndex > 0) {
      setSelectedPageIndex(selectedPageIndex - 1);
    }
  }, [selectedPageIndex]);

  return {
    selectedPageIndex,
    selectedPage,
    setSelectedPageIndex,
    selectNextPage,
    selectPreviousPage
  };
}
