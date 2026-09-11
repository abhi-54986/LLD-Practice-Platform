import { GoogleGenAI, Schema, Type } from "@google/genai";
import { GEMINI_MODEL } from "../config/ai.js";
import { IEvaluationInput } from "./IEvaluationInput.js";

export interface GeminiClient {
  evaluate(rubric: string, input: IEvaluationInput): Promise<string>;
}

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    dimensionScores: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          dimension: { type: Type.STRING },
          score: { type: Type.INTEGER },
          evidence: { type: Type.STRING },
          concern: { type: Type.STRING },
          suggestion: { type: Type.STRING },
        },
        required: ["dimension", "score", "evidence", "suggestion"],
      },
    },
    overallSummary: { type: Type.STRING },
    confidence: { type: Type.NUMBER },
  },
  required: ["dimensionScores", "overallSummary", "confidence"],
};

export class GoogleGeminiClient implements GeminiClient {
  private client?: GoogleGenAI;

  constructor(
    private readonly apiKey = process.env.GEMINI_API_KEY,
    private readonly model = GEMINI_MODEL,
  ) {}

  async evaluate(rubric: string, input: IEvaluationInput): Promise<string> {
    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }
    this.client ??= new GoogleGenAI({ apiKey: this.apiKey });
    const context = input.getProblemContext();
    const response = await this.client.models.generateContent({
      model: this.model,
      contents: `${rubric}\n\nProblem requirements:\n${context.requirements}\n\nConstraints:\n${context.constraints.join("\n")}\n\nLearner submission:\n${input.getEvaluableText()}`,
      config: {
        responseMimeType: "application/json",
        responseSchema,
      },
    });
    if (!response.text) {
      throw new Error("Gemini returned an empty response");
    }
    return response.text;
  }
}