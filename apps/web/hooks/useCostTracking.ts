import { useState, useEffect } from "react";

const TOTAL_COST_KEY = "speech-generator-total-cost-usd";
const USD_TO_KRW = 1350; // 환율

export function useCostTracking() {
  const [totalCostUSD, setTotalCostUSD] = useState(0);
  const [totalCostKRW, setTotalCostKRW] = useState(0);

  // 초기 로드: localStorage에서 총 비용 가져오기
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem(TOTAL_COST_KEY);
      if (stored) {
        const cost = parseFloat(stored);
        setTotalCostUSD(cost);
        setTotalCostKRW(Math.round(cost * USD_TO_KRW));
      }
    } catch (error) {
      console.error("Failed to load total cost:", error);
    }
  }, []);

  // 비용 추가: 새로운 생성 비용을 누적
  const addCost = (costUSD: number) => {
    if (typeof window === "undefined" || !costUSD || costUSD <= 0) return;

    try {
      const newTotal = totalCostUSD + costUSD;
      localStorage.setItem(TOTAL_COST_KEY, newTotal.toString());
      setTotalCostUSD(newTotal);
      setTotalCostKRW(Math.round(newTotal * USD_TO_KRW));
    } catch (error) {
      console.error("Failed to add cost:", error);
    }
  };

  // 비용 초기화
  const resetCost = () => {
    if (typeof window === "undefined") return;

    try {
      localStorage.removeItem(TOTAL_COST_KEY);
      setTotalCostUSD(0);
      setTotalCostKRW(0);
    } catch (error) {
      console.error("Failed to reset cost:", error);
    }
  };

  return {
    totalCostUSD,
    totalCostKRW,
    addCost,
    resetCost,
  };
}
