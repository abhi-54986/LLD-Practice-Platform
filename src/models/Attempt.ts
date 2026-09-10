import { Schema, model } from "mongoose";

const AttemptSchema = new Schema(
  {
    learnerId: { type: Schema.Types.ObjectId, ref: "Learner", required: true, index: true },
    problemId: { type: Schema.Types.ObjectId, ref: "Problem", required: true, index: true },
    status: { type: String, enum: ["InProgress", "Submitted"], default: "InProgress" },
    startedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

AttemptSchema.index({ learnerId: 1, problemId: 1, createdAt: -1 });

export const Attempt = model("Attempt", AttemptSchema);