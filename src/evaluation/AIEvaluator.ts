import { DeterministicChecker } from "./DeterministicChecker.js";
import { GeminiClient } from "./GeminiClient.js";
import { IEvaluationInput } from "./IEvaluationInput.js";
import { DimensionScore, EvaluationResult, IEvaluator } from "./IEvaluator.js";

const RUBRIC_V1 = `Evaluate the learner's low-level design using exactly these 8 dimensions:
1. Requirement understanding
2. Class responsibilities
3. Coupling / cohesion
4. Encapsulation & interfaces
5. Abstraction / pattern use
6. Extensibility
7. Edge cases & testability
8. Quality of explanation

Return evidence that quotes or closely paraphrases only the learner's submission. Do not invent evidence.
Return one score from 1 to 5, evidence, an optional concern, and an actionable suggestion for every dimension.
Do not return an aggregate score out of 100.`;

const dimensions = [
  "Requirement understanding",
  "Class responsibilities",
  "Coupling / cohesion",
  "Encapsulation & interfaces",
  "Abstraction / pattern use",
  "Extensibility",
  "Edge cases & testability",
  "Quality of explanation",
];

export class AIEvaluator implements IEvaluator {
  constructor(
    private readonly checker: DeterministicChecker,
    private readonly geminiClient: GeminiClient,
  ) {}

  async evaluate(input: IEvaluationInput): Promise<EvaluationResult> {
    const checks = this.checker.check(input.getEvaluableText());
    if (!Object.values(checks).every(Boolean)) {
      return {
        evaluatorType: "deterministic-only",
        deterministicChecks: checks,
        failureReason: this.checker.getFailureReason(checks),
      };
    }

    let parseError: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const raw = await this.geminiClient.evaluate(RUBRIC_V1, input);
      try {
        return { evaluatorType: "ai", deterministicChecks: checks, ...parseResult(raw) };
      } catch (error: unknown) {
        parseError = error;
      }
    }
    throw new Error(`Evaluator error - retry available: ${parseError instanceof Error ? parseError.message : "invalid JSON"}`);
  }
}

function parseResult(raw: string): Omit<EvaluationResult, "evaluatorType" | "deterministicChecks"> {
  const result: unknown = JSON.parse(raw);
  if (!isRecord(result) || !Array.isArray(result.dimensionScores) || result.dimensionScores.length !== dimensions.length) {
    throw new Error("Evaluator returned an invalid dimension score list");
  }

  const dimensionScores = result.dimensionScores.map((score) => validateDimensionScore(score));
  if (dimensions.some((dimension) => !dimensionScores.some((score) => score.dimension === dimension))) {
    throw new Error("Evaluator did not return all rubric dimensions");
  }
  if (typeof result.overallSummary !== "string" || typeof result.confidence !== "number" || result.confidence < 0 || result.confidence > 1) {
    throw new Error("Evaluator returned an invalid summary or confidence");
  }
  return { dimensionScores, overallSummary: result.overallSummary, confidence: result.confidence };
}

function validateDimensionScore(value: unknown): DimensionScore {
  if (!isRecord(value) || typeof value.dimension !== "string" || !Number.isInteger(value.score) || value.score < 1 || value.score > 5 || typeof value.evidence !== "string" || typeof value.suggestion !== "string" || (value.concern !== undefined && typeof value.concern !== "string")) {
    throw new Error("Evaluator returned an invalid dimension score");
  }
  return {
    dimension: value.dimension,
    score: value.score,
    evidence: value.evidence,
    concern: value.concern,
    suggestion: value.suggestion,
  };
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null;
}