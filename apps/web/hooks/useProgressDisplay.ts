import { useEffect, useState } from "react";

interface UseProgressDisplayOptions {
  isLoading: boolean;
  actualProgress: number;
  totalItems: number;
}

/**
 * Custom hook for smooth progress display with automatic animation
 * Prevents memory leaks by properly cleaning up intervals
 */
export function useProgressDisplay({
  isLoading,
  actualProgress,
  totalItems
}: UseProgressDisplayOptions): number {
  const [displayProgress, setDisplayProgress] = useState(0);

  // Calculate base percentage from actual progress
  const basePercent = totalItems > 0 ? (actualProgress / totalItems) * 100 : 0;

  // Reset progress to 0 when loading starts
  useEffect(() => {
    if (isLoading) {
      setDisplayProgress(0);
    }
  }, [isLoading]);

  // Smooth progress animation during loading
  useEffect(() => {
    if (!isLoading) return;

    const interval = setInterval(() => {
      setDisplayProgress((prev) => {
        // Gradually increase from 0 to 98% (never decrease)
        const nextTarget = Math.max(prev, basePercent);
        const increment = Math.max(1, (98 - prev) * 0.05);
        return Math.min(98, prev + increment);
      });
    }, 180);

    return () => clearInterval(interval);
  }, [isLoading, basePercent]);

  // Complete progress animation when loading finishes
  useEffect(() => {
    if (isLoading) return;

    const interval = setInterval(() => {
      setDisplayProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        const step = Math.max(1, (100 - prev) * 0.25);
        return Math.min(100, prev + step);
      });
    }, 120);

    return () => clearInterval(interval);
  }, [isLoading]);

  // Reset progress when component unmounts or loading is cancelled
  useEffect(() => {
    return () => {
      setDisplayProgress(0);
    };
  }, []);

  return displayProgress;
}
