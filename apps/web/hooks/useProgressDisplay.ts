import { useEffect, useState } from "react";

interface UseProgressDisplayOptions {
  isLoading: boolean;
  actualProgress: number;
  totalItems: number;
}

/**
 * Custom hook for smooth progress display synchronized with actual progress
 * Animates smoothly towards actual progress to provide visual feedback
 */
export function useProgressDisplay({
  isLoading,
  actualProgress,
  totalItems
}: UseProgressDisplayOptions): number {
  const [displayProgress, setDisplayProgress] = useState(0);

  // Calculate actual percentage from progress
  const actualPercent = totalItems > 0 ? (actualProgress / totalItems) * 100 : 0;

  // Reset progress to 0 when loading starts
  useEffect(() => {
    if (isLoading) {
      setDisplayProgress(0);
    }
  }, [isLoading]);

  // Smoothly animate towards actual progress during loading
  useEffect(() => {
    if (!isLoading) return;

    const interval = setInterval(() => {
      setDisplayProgress((prev) => {
        // If we've reached or passed the target, set to exact value
        if (prev >= actualPercent) {
          return actualPercent;
        }

        // Smoothly move towards actual progress
        const diff = actualPercent - prev;
        const step = Math.max(0.5, diff * 0.1); // Smoother animation
        return Math.min(actualPercent, prev + step);
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isLoading, actualPercent]);

  // Complete progress animation when loading finishes
  useEffect(() => {
    if (isLoading) return;

    const interval = setInterval(() => {
      setDisplayProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        const step = Math.max(2, (100 - prev) * 0.3);
        return Math.min(100, prev + step);
      });
    }, 80);

    return () => clearInterval(interval);
  }, [isLoading]);

  // Reset progress when component unmounts
  useEffect(() => {
    return () => {
      setDisplayProgress(0);
    };
  }, []);

  return Math.round(displayProgress);
}
