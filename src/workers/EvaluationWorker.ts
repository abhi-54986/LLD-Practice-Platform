import { Evaluation } from "../models/Evaluation.js";
import { Attempt } from "../models/Attempt.js";
import { Problem } from "../models/Problem.js";
import { Submission } from "../models/Submission.js";
import { EVALUATION_TIMEOUT_MS } from "../config/ai.js";
import { EvaluatorFactory } from "../evaluation/EvaluatorFactory.js";
import { TextSubmissionInput } from "../evaluation/TextSubmissionInput.js";

export class EvaluationWorker {
  async run(submissionId: string): Promise<void> {
    try {
      const currentSubmission = await Submission.findById(submissionId);
      if (!currentSubmission) {
        throw new Error("Submission not found");
      }
      if (
        currentSubmission.status === "Evaluating" &&
        Date.now() - currentSubmission.updatedAt.getTime() > EVALUATION_TIMEOUT_MS
      ) {
        await Submission.updateOne(
          { _id: submissionId },
          { $set: { status: "Failed", failureReason: "Evaluator timed out" } },
        );
        return;
      }

      const submission = await Submission.findByIdAndUpdate(
        submissionId,
        { $set: { status: "Evaluating" } },
        { new: true },
      );
      if (!submission) {
        throw new Error("Submission not found");
      }

      const attempt = await Attempt.findById(submission.attemptId);
      if (!attempt) {
        throw new Error("Attempt not found");
      }
      const problem = await Problem.findById(attempt.problemId);
      if (!problem) {
        throw new Error("Problem not found");
      }

      const evaluator = EvaluatorFactory.get("ai");
      const result = await this.evaluateWithTimeout(
        evaluator.evaluate(new TextSubmissionInput(submission, problem)),
      );
      await Evaluation.findOneAndUpdate(
        { submissionId: submission._id },
        {
          $set: {
            rubricVersion: "v1",
            evaluatorType: result.evaluatorType,
            deterministicChecks: result.deterministicChecks,
            dimensionScores: result.dimensionScores,
            overallSummary: result.overallSummary,
            confidence: result.confidence,
            completedAt: new Date(),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );

      if (result.evaluatorType === "deterministic-only") {
        await Submission.updateOne(
          { _id: submissionId },
          { $set: { status: "Failed", failureReason: result.failureReason ?? "Deterministic checks failed" } },
        );
      } else {
        await Submission.updateOne({ _id: submissionId }, { $set: { status: "Completed" }, $unset: { failureReason: 1 } });
      }
    } catch (error: unknown) {
      const failureReason = error instanceof Error ? error.message : "Evaluator error - retry available";
      await Submission.updateOne(
        { _id: submissionId },
        { $set: { status: "Failed", failureReason } },
      );
    }
  }

  private async evaluateWithTimeout<T>(evaluation: Promise<T>): Promise<T> {
    let timeoutHandle: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error("Evaluator timed out")), EVALUATION_TIMEOUT_MS);
    });

    try {
      return await Promise.race([evaluation, timeout]);
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  }
}

export const evaluationWorker = new EvaluationWorker();