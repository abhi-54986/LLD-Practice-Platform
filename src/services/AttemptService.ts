import { Types } from "mongoose";
import { AppError } from "../errors/AppError.js";
import { Attempt } from "../models/Attempt.js";
import { Problem } from "../models/Problem.js";

export class AttemptService {
  async startAttempt(learnerId: string, problemId: string) {
    this.assertObjectId(learnerId, "learnerId");
    this.assertObjectId(problemId, "problemId");

    const problemExists = await Problem.exists({ _id: problemId });
    if (!problemExists) {
      throw new AppError(404, "PROBLEM_NOT_FOUND", "Problem not found");
    }

    return Attempt.create({ learnerId, problemId });
  }

  async getAttempt(attemptId: string) {
    this.assertObjectId(attemptId, "attemptId");

    const attempt = await Attempt.findById(attemptId);
    if (!attempt) {
      throw new AppError(404, "ATTEMPT_NOT_FOUND", "Attempt not found");
    }

    return attempt;
  }

  async getHistory(learnerId: string, problemId?: string, limit = 20, cursor?: string) {
    this.assertObjectId(learnerId, "learnerId");
    if (problemId) {
      this.assertObjectId(problemId, "problemId");
    }

    const query: Record<string, unknown> = { learnerId };
    if (problemId) {
      query.problemId = problemId;
    }
    if (cursor) {
      const decodedCursor = this.decodeCursor(cursor);
      query.$or = [
        { startedAt: { $lt: decodedCursor.startedAt } },
        { startedAt: decodedCursor.startedAt, _id: { $lt: decodedCursor.id } },
      ];
    }

    const attempts = await Attempt.find(query)
      .sort({ startedAt: -1, _id: -1 })
      .limit(limit + 1);
    const hasMore = attempts.length > limit;
    const items = hasMore ? attempts.slice(0, limit) : attempts;

    return {
      items,
      nextCursor: hasMore ? this.encodeCursor(items[items.length - 1]) : undefined,
    };
  }

  private assertObjectId(value: string, field: string): void {
    if (!Types.ObjectId.isValid(value)) {
      throw new AppError(400, "INVALID_ID", `Invalid ${field}`);
    }
  }

  private encodeCursor(attempt: { startedAt: Date; _id: Types.ObjectId }): string {
    return Buffer.from(`${attempt.startedAt.toISOString()}|${attempt._id.toString()}`).toString("base64url");
  }

  private decodeCursor(cursor: string): { startedAt: Date; id: Types.ObjectId } {
    try {
      const [startedAt, id] = Buffer.from(cursor, "base64url").toString("utf8").split("|");
      if (!startedAt || !id || !Types.ObjectId.isValid(id) || Number.isNaN(Date.parse(startedAt))) {
        throw new Error("invalid cursor");
      }
      return { startedAt: new Date(startedAt), id: new Types.ObjectId(id) };
    } catch {
      throw new AppError(400, "INVALID_CURSOR", "Invalid cursor");
    }
  }
}