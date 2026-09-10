import { Schema, model } from "mongoose";

const DimensionScoreSchema = new Schema(
  {
    dimension: { type: String, required: true },
    score: { type: Number, min: 1, max: 5, required: true },
    evidence: { type: String, required: true },
    concern: { type: String },
    suggestion: { type: String, required: true },
  },
  { _id: false },
);

const EvaluationSchema = new Schema(
  {
    submissionId: { type: Schema.Types.ObjectId, ref: "Submission", required: true, unique: true },
    rubricVersion: { type: String, required: true },
    evaluatorType: { type: String, enum: ["ai", "deterministic-only"], required: true },
    deterministicChecks: {
      hasRequirementsSection: Boolean,
      hasClassListSection: Boolean,
      hasResponsibilitiesSection: Boolean,
      hasTradeoffsSection: Boolean,
      minLengthMet: Boolean,
    },
    dimensionScores: [DimensionScoreSchema],
    overallSummary: { type: String },
    confidence: { type: Number, min: 0, max: 1 },
    completedAt: { type: Date },
  },
  { timestamps: true },
);

export const Evaluation = model("Evaluation", EvaluationSchema);