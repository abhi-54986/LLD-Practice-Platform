import { Schema, model } from "mongoose";

const LearnerSchema = new Schema(
  {
    displayName: { type: String, required: true },
  },
  { timestamps: true },
);

export const Learner = model("Learner", LearnerSchema);