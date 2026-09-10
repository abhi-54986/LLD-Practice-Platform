import { Types } from "mongoose";
import { AppError } from "../errors/AppError.js";
import { Evaluation } from "../models/Evaluation.js";
import { Attempt } from "../models/Attempt.js";
import { Submission } from "../models/Submission.js";

export class SubmissionService {
  async submit(attemptId: string, content: string, idempotencyKey: string) {
    this.assertObjectId(attemptId, "attemptId");
    if (!content || !content.trim()) {
      throw new AppError(400, "EMPTY_CONTENT", "Submission content cannot be empty");
    }
    if (!idempotencyKey || !idempotencyKey.trim()) {
      throw new AppError(400, "MISSING_IDEMPOTENCY_KEY", "idempotencyKey is required");
    }

    const attempt = await Attempt.findById(attemptId);
    if (!attempt) {
      throw new AppError(404, "ATTEMPT_NOT_FOUND", "Attempt not found");
    }

    const existingByKey = await Submission.findOne({ idempotencyKey });
    if (existingByKey) {
      throw new AppError(409, "DUPLICATE_IDEMPOTENCY_KEY", "Idempotency key has already been used");
    }

    const existingForAttempt = await Submission.findOne({ attemptId });
    if (existingForAttempt) {
      throw new AppError(409, "SUBMISSION_EXISTS", "An active submission already exists for this attempt");
    }

    try {
      const submission = await Submission.create({ attemptId, content, idempotencyKey });
      await Attempt.updateOne({ _id: attemptId }, { $set: { status: "Submitted" } });
      return submission;
    } catch (error: unknown) {
      if (this.isDuplicateKeyError(error)) {
        throw new AppError(409, "DUPLICATE_SUBMISSION", "A submission with this attempt or idempotency key already exists");
      }
      throw error;
    }
  }

  async getStatus(submissionId: string) {
    this.assertObjectId(submissionId, "submissionId");

    const submission = await Submission.findById(submissionId);
    if (!submission) {
      throw new AppError(404, "SUBMISSION_NOT_FOUND", "Submission not found");
    }

    const evaluation = await Evaluation.findOne({ submissionId });
    return { status: submission.status, evaluation: evaluation ?? undefined };
  }

  private assertObjectId(value: string, field: string): void {
    if (!Types.ObjectId.isValid(value)) {
      throw new AppError(400, "INVALID_ID", `Invalid ${field}`);
    }
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
  }
}