import { Schema, model } from "mongoose";

export const ProblemSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], required: true },
    requirementsMd: { type: String, required: true },
    constraints: [{ type: String }],
    tags: [{ type: String, index: true }],
  },
  { timestamps: true },
);

export const Problem = model("Problem", ProblemSchema);