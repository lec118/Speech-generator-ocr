export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
};

export type ModelPricing = {
  inputPerThousandTokens: number;
  outputPerThousandTokens: number;
};

export type CostEstimate = {
  inputCost: number;
  outputCost: number;
  totalCost: number;
};

function roundCurrency(value: number): number {
  return Math.round(value * 10000) / 10000;
}

export function estimateUsageCost(usage: TokenUsage, pricing: ModelPricing): CostEstimate {
  const inputTokens = Math.max(usage.inputTokens, 0);
  const outputTokens = Math.max(usage.outputTokens, 0);

  const inputCost = roundCurrency((inputTokens / 1000) * pricing.inputPerThousandTokens);
  const outputCost = roundCurrency((outputTokens / 1000) * pricing.outputPerThousandTokens);
  const totalCost = roundCurrency(inputCost + outputCost);

  return {
    inputCost,
    outputCost,
    totalCost
  };
}
