import { Schema, model } from "mongoose";

const SubmissionSchema = new Schema(
  {
    attemptId: { type: Schema.Types.ObjectId, ref: "Attempt", required: true, unique: true },
    contentType: { type: String, enum: ["text"], default: "text" },
    content: { type: String, required: true },
    status: {
      type: String,
      enum: ["Submitted", "Evaluating", "Completed", "Failed"],
      default: "Submitted",
      index: true,
    },
    idempotencyKey: { type: String, required: true, unique: true },
    failureReason: { type: String },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export const Submission = model("Submission", SubmissionSchema);