import { useState, useEffect } from "react";

const HISTORY_KEY = "speech-generator-history";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000; // 7일
const MAX_HISTORY_COUNT = 50; // 최대 50개

export interface HistoryItem {
  id: string;
  timestamp: number;
  topic: string;
  language: string;
  pageCount: number;
  results: Array<{
    pageIndex: number;
    korean: string;
    translated?: string;
  }>;
}

export function useHistory() {
  const [histories, setHistories] = useState<HistoryItem[]>([]);

  // 로드: localStorage에서 히스토리 가져오기
  const loadHistories = () => {
    if (typeof window === "undefined") return [];

    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (!stored) return [];

      const parsed = JSON.parse(stored) as HistoryItem[];
      const now = Date.now();

      // 7일 이상 된 항목 제거
      const filtered = parsed.filter(
        (item) => now - item.timestamp < SEVEN_DAYS_MS
      );

      // 변경사항이 있으면 localStorage 업데이트
      if (filtered.length !== parsed.length) {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
      }

      // 최신순 정렬
      return filtered.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error("Failed to load history:", error);
      return [];
    }
  };

  // 초기 로드
  useEffect(() => {
    setHistories(loadHistories());
  }, []);

  // 저장: 새로운 히스토리 추가
  const saveHistory = (
    topic: string,
    language: string,
    results: Array<{
      pageIndex: number;
      korean: string;
      translated?: string;
    }>
  ) => {
    if (typeof window === "undefined") return;

    try {
      const newItem: HistoryItem = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        topic: topic || "제목 없음",
        language: language || "none",
        pageCount: results.length,
        results,
      };

      const current = loadHistories();
      const updated = [newItem, ...current];

      // 최대 50개까지만 유지
      const limited = updated.slice(0, MAX_HISTORY_COUNT);

      localStorage.setItem(HISTORY_KEY, JSON.stringify(limited));
      setHistories(limited);
    } catch (error) {
      console.error("Failed to save history:", error);
    }
  };

  // 삭제: 특정 히스토리 삭제
  const deleteHistory = (id: string) => {
    if (typeof window === "undefined") return;

    try {
      const current = loadHistories();
      const updated = current.filter((item) => item.id !== id);

      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      setHistories(updated);
    } catch (error) {
      console.error("Failed to delete history:", error);
    }
  };

  // 리프레시: localStorage에서 다시 로드
  const refreshHistories = () => {
    setHistories(loadHistories());
  };

  return {
    histories,
    saveHistory,
    deleteHistory,
    refreshHistories,
  };
}
