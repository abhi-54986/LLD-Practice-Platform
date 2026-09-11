export type DeterministicChecks = {
  hasRequirementsSection: boolean;
  hasClassListSection: boolean;
  hasResponsibilitiesSection: boolean;
  hasTradeoffsSection: boolean;
  minLengthMet: boolean;
};

export type DimensionScore = {
  dimension: string;
  score: number;
  evidence: string;
  concern?: string;
  suggestion: string;
};

export type EvaluationResult = {
  evaluatorType: "ai" | "deterministic-only";
  deterministicChecks: DeterministicChecks;
  dimensionScores?: DimensionScore[];
  overallSummary?: string;
  confidence?: number;
  failureReason?: string;
};

export interface IEvaluator {
  evaluate(input: import("./IEvaluationInput.js").IEvaluationInput): Promise<EvaluationResult>;
}