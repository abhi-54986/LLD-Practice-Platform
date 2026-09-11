import { AIEvaluator } from "./AIEvaluator.js";
import { DeterministicChecker } from "./DeterministicChecker.js";
import { GoogleGeminiClient } from "./GeminiClient.js";
import { IEvaluator } from "./IEvaluator.js";

export class EvaluatorFactory {
  static get(evaluatorType: "ai"): IEvaluator {
    switch (evaluatorType) {
      case "ai":
        return new AIEvaluator(new DeterministicChecker(), new GoogleGeminiClient());
    }
  }
}