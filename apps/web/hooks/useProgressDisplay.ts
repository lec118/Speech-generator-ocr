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

  // Smooth progress animation during loading - tracks actual progress more closely
  useEffect(() => {
    if (!isLoading) return;

    const interval = setInterval(() => {
      setDisplayProgress((prev) => {
        // Target the actual progress percentage (capped at 98% until complete)
        const targetPercent = Math.min(98, basePercent);

        // If we're behind the actual progress, catch up faster
        if (prev < targetPercent) {
          const gap = targetPercent - prev;
          // Larger gap = faster catch-up (min 0.5%, max 5% per tick)
          const increment = Math.min(5, Math.max(0.5, gap * 0.3));
          return Math.min(98, prev + increment);
        }

        // If we're at or ahead, move slowly toward the target
        const slowIncrement = Math.max(0.1, (98 - prev) * 0.02);
        return Math.min(98, prev + slowIncrement);
      });
    }, 100);

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
