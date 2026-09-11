import { Router, Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { AppError } from "../errors/AppError.js";
import { AttemptService } from "../services/AttemptService.js";
import { SubmissionService } from "../services/SubmissionService.js";
import { Problem } from "../models/Problem.js";
import { evaluationWorker } from "../workers/EvaluationWorker.js";

const DEFAULT_LEARNER_ID = new Types.ObjectId("000000000000000000000001").toString();
const attemptService = new AttemptService();
const submissionService = new SubmissionService();
const router = Router();

router.get("/problems", asyncHandler(async (req, res) => {
  const { limit, cursor } = parsePagination(req);
  const query = cursor ? { _id: { $gt: cursor } } : {};
  const problems = await Problem.find(query).sort({ _id: 1 }).limit(limit + 1);
  const hasMore = problems.length > limit;
  const items = hasMore ? problems.slice(0, limit) : problems;
  res.json({ items, nextCursor: hasMore ? items[items.length - 1]._id.toString() : undefined });
}));

router.get("/problems/:id", asyncHandler(async (req, res) => {
  const problemId = routeParam(req, "id");
  if (!Types.ObjectId.isValid(problemId)) {
    throw new AppError(400, "INVALID_ID", "Invalid id");
  }
  const problem = await Problem.findById(problemId);
  if (!problem) {
    throw new AppError(404, "PROBLEM_NOT_FOUND", "Problem not found");
  }
  res.json(problem);
}));

router.post("/attempts", asyncHandler(async (req, res) => {
  const problemId = req.body?.problemId;
  if (typeof problemId !== "string") {
    throw new AppError(400, "INVALID_REQUEST", "problemId is required");
  }
  const attempt = await attemptService.startAttempt(getLearnerId(req), problemId);
  res.status(201).json(attempt);
}));

router.get("/attempts", asyncHandler(async (req, res) => {
  const learnerId = typeof req.query.learnerId === "string" ? req.query.learnerId : getLearnerId(req);
  const problemId = typeof req.query.problemId === "string" ? req.query.problemId : undefined;
  const { limit, cursor } = parsePagination(req);
  const history = await attemptService.getHistory(learnerId, problemId, limit, cursor);
  res.json(history);
}));

router.get("/attempts/:id", asyncHandler(async (req, res) => {
  res.json(await attemptService.getAttempt(routeParam(req, "id")));
}));

router.post("/attempts/:id/submissions", asyncHandler(async (req, res) => {
  const { content, idempotencyKey } = req.body ?? {};
  if (typeof content !== "string" || typeof idempotencyKey !== "string") {
    throw new AppError(400, "INVALID_REQUEST", "content and idempotencyKey are required strings");
  }
  const submission = await submissionService.submit(routeParam(req, "id"), content, idempotencyKey);
  setImmediate(() => void evaluationWorker.run(submission._id.toString()));
  res.status(202).json({ submissionId: submission._id, status: submission.status });
}));

router.get("/submissions/:id", asyncHandler(async (req, res) => {
  res.json(await submissionService.getStatus(routeParam(req, "id")));
}));

router.post("/submissions/:id/retry-evaluation", asyncHandler(async (req, res) => {
  const submissionId = routeParam(req, "id");
  await submissionService.retryEvaluation(submissionId);
  setImmediate(() => void evaluationWorker.run(submissionId));
  res.status(202).json({ status: "Evaluating" });
}));

function getLearnerId(req: Request): string {
  const header = req.header("X-Learner-Id");
  return header?.trim() || DEFAULT_LEARNER_ID;
}

function routeParam(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== "string") {
    throw new AppError(400, "INVALID_REQUEST", `${name} is required`);
  }
  return value;
}

function parsePagination(req: Request): { limit: number; cursor?: string } {
  const rawLimit = typeof req.query.limit === "string" ? Number(req.query.limit) : 20;
  if (!Number.isInteger(rawLimit) || rawLimit < 1 || rawLimit > 100) {
    throw new AppError(400, "INVALID_LIMIT", "limit must be an integer between 1 and 100");
  }
  const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
  return { limit: rawLimit, cursor };
}

function asyncHandler(handler: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    void handler(req, res, next).catch(next);
  };
}

export { router as apiRouter };