import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import app from "../src/app.js";
import { connectToDatabase, disconnectFromDatabase } from "../src/config/database.js";
import { AIEvaluator } from "../src/evaluation/AIEvaluator.js";
import { DeterministicChecker } from "../src/evaluation/DeterministicChecker.js";
import { Evaluation } from "../src/models/Evaluation.js";
import { Problem } from "../src/models/Problem.js";
import { Submission } from "../src/models/Submission.js";
import { Attempt } from "../src/models/Attempt.js";
import { EvaluatorFactory } from "../src/evaluation/EvaluatorFactory.js";
import { EvaluationWorker } from "../src/workers/EvaluationWorker.js";
import { transitionSubmission } from "../src/services/SubmissionStateMachine.js";

const learnerId = "000000000000000000000001";
const allSections = [
  "## Requirements Understanding",
  "## Classes & Responsibilities",
  "## Relationships",
  "## Trade-offs & Assumptions",
];
const validResult = {
  evaluatorType: "ai" as const,
  deterministicChecks: {
    hasRequirementsSection: true,
    hasClassListSection: true,
    hasResponsibilitiesSection: true,
    hasTradeoffsSection: true,
    minLengthMet: true,
  },
  dimensionScores: [
    "Requirement understanding",
    "Class responsibilities",
    "Coupling / cohesion",
    "Encapsulation & interfaces",
    "Abstraction / pattern use",
    "Extensibility",
    "Edge cases & testability",
    "Quality of explanation",
  ].map((dimension) => ({ dimension, score: 4, evidence: "Evidence from the submission", suggestion: "Add a focused test" })),
  overallSummary: "A clear design.",
  confidence: 0.8,
};

function contentWithWords(wordCount: number, sections = allSections): string {
  const headings = sections.join(" ");
  const remaining = Math.max(0, wordCount - headings.split(/\s+/).length);
  return `${sections.join("\n\n")} ${Array(remaining).fill("design").join(" ")}`;
}

const inputFor = (text: string) => ({
  getEvaluableText: () => text,
  getProblemContext: () => ({ requirements: "Requirements", constraints: ["Constraint"] }),
});

describe("DeterministicChecker", () => {
  const checker = new DeterministicChecker();

  it.each(allSections)("detects %s when present", (section) => {
    const checks = checker.check(contentWithWords(150));
    expect(checks[section === allSections[0] ? "hasRequirementsSection" : section === allSections[1] ? "hasClassListSection" : section === allSections[2] ? "hasResponsibilitiesSection" : "hasTradeoffsSection"]).toBe(true);
  });

  it.each(allSections)("detects %s when missing", (missingSection) => {
    const checks = checker.check(contentWithWords(150, allSections.filter((section) => section !== missingSection)));
    const key = missingSection === allSections[0] ? "hasRequirementsSection" : missingSection === allSections[1] ? "hasClassListSection" : missingSection === allSections[2] ? "hasResponsibilitiesSection" : "hasTradeoffsSection";
    expect(checks[key]).toBe(false);
    expect(checks.minLengthMet).toBe(true);
  });

  it("enforces the 149 versus 150 word boundary", () => {
    expect(checker.check(contentWithWords(149)).minLengthMet).toBe(false);
    expect(checker.check(contentWithWords(150)).minLengthMet).toBe(true);
  });
});

describe("AIEvaluator", () => {
  it("parses valid JSON from the mocked Gemini client", async () => {
    const client = { evaluate: vi.fn().mockResolvedValue(JSON.stringify(validResult)) };
    const result = await new AIEvaluator(new DeterministicChecker(), client).evaluate(inputFor(contentWithWords(150)));
    expect(result.evaluatorType).toBe("ai");
    expect(result.dimensionScores).toHaveLength(8);
    expect(client.evaluate).toHaveBeenCalledTimes(1);
  });

  it("retries malformed JSON exactly once, then fails", async () => {
    const client = { evaluate: vi.fn().mockResolvedValue("not json") };
    await expect(new AIEvaluator(new DeterministicChecker(), client).evaluate(inputFor(contentWithWords(150)))).rejects.toThrow("Evaluator error");
    expect(client.evaluate).toHaveBeenCalledTimes(2);
  });

  it("short-circuits deterministic failure without invoking Gemini", async () => {
    const client = { evaluate: vi.fn() };
    const result = await new AIEvaluator(new DeterministicChecker(), client).evaluate(inputFor("## Requirements Understanding\nOnly one section."));
    expect(result.evaluatorType).toBe("deterministic-only");
    expect(client.evaluate).not.toHaveBeenCalled();
  });
});

describe("submission state machine", () => {
  it.each([
    ["Submitted", "Evaluating"],
    ["Evaluating", "Completed"],
    ["Evaluating", "Failed"],
    ["Failed", "Evaluating"],
  ] as const)("allows %s -> %s", (from, to) => {
    expect(transitionSubmission(from, to)).toBe(to);
  });

  it("rejects Completed -> Evaluating", () => {
    expect(() => transitionSubmission("Completed", "Evaluating")).toThrow("Illegal submission transition");
  });
});

describe("API integration against mongodb-memory-server", () => {
  let mongo: MongoMemoryServer;
  let server: ReturnType<typeof app.listen>;
  let baseUrl: string;
  let problem: InstanceType<typeof Problem>;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await connectToDatabase(mongo.getUri());
    problem = await Problem.create({ slug: "test-problem", title: "Test Problem", difficulty: "Easy", requirementsMd: "Test requirements", constraints: [], tags: ["test"] });
    server = app.listen(0);
    baseUrl = `http://127.0.0.1:${(server.address() as { port: number }).port}/api`;
    vi.spyOn(EvaluatorFactory, "get").mockReturnValue({ evaluate: vi.fn().mockResolvedValue(validResult) });
  });

  afterEach(async () => {
    await Promise.all([Evaluation.deleteMany({}), Submission.deleteMany({}), Attempt.deleteMany({})]);
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    server.close();
    await disconnectFromDatabase();
    await mongo.stop();
  });

  it("completes submit -> poll -> Completed", async () => {
    const attemptResponse = await fetch(`${baseUrl}/attempts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ problemId: problem._id.toString() }) });
    const attempt = await attemptResponse.json();
    const submissionResponse = await fetch(`${baseUrl}/attempts/${attempt._id}/submissions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: contentWithWords(150), idempotencyKey: "integration-complete" }) });
    const submission = await submissionResponse.json();
    expect(submissionResponse.status).toBe(202);
    let status: { status: string } = { status: "Submitted" };
    for (let poll = 0; poll < 20 && status.status !== "Completed"; poll += 1) {
      await new Promise((resolve) => setTimeout(resolve, 25));
      status = await (await fetch(`${baseUrl}/submissions/${submission.submissionId}`)).json();
    }
    expect(status.status).toBe("Completed");
  });

  it("returns 409 for duplicate idempotency key and active attempt submission", async () => {
    const attempt = await Attempt.create({ learnerId, problemId: problem._id });
    const first = await fetch(`${baseUrl}/attempts/${attempt._id}/submissions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: "content", idempotencyKey: "duplicate-key" }) });
    const duplicateKey = await fetch(`${baseUrl}/attempts/${attempt._id}/submissions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: "content", idempotencyKey: "duplicate-key" }) });
    expect(first.status).toBe(202);
    expect(duplicateKey.status).toBe(409);
    const otherAttempt = await Attempt.create({ learnerId, problemId: problem._id });
    await Submission.create({ attemptId: otherAttempt._id, content: "content", idempotencyKey: "active-key" });
    const activeConflict = await fetch(`${baseUrl}/attempts/${otherAttempt._id}/submissions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: "content", idempotencyKey: "another-key" }) });
    expect(activeConflict.status).toBe(409);
  });

  it("rejects empty content before writing a submission", async () => {
    const attempt = await Attempt.create({ learnerId, problemId: problem._id });
    const before = await Submission.countDocuments();
    const response = await fetch(`${baseUrl}/attempts/${attempt._id}/submissions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: "   ", idempotencyKey: "empty-content" }) });
    expect(response.status).toBe(400);
    expect(await Submission.countDocuments()).toBe(before);
  });

  it("marks a timed-out Evaluating submission Failed", async () => {
    const attempt = await Attempt.create({ learnerId, problemId: problem._id });
    const submission = await Submission.create({ attemptId: attempt._id, content: "content", idempotencyKey: "timeout-key", status: "Evaluating" });
    await Submission.collection.updateOne({ _id: submission._id }, { $set: { updatedAt: new Date(Date.now() - 61_000) } });
    await new EvaluationWorker().run(submission._id.toString());
    const updated = await Submission.findById(submission._id);
    expect(updated?.status).toBe("Failed");
    expect(updated?.failureReason).toBe("Evaluator timed out");
  });

  it("marks a Gemini evaluator exception Failed", async () => {
    vi.spyOn(EvaluatorFactory, "get").mockReturnValueOnce({ evaluate: vi.fn().mockRejectedValue(new Error("Gemini unavailable")) });
    const attempt = await Attempt.create({ learnerId, problemId: problem._id });
    const submission = await Submission.create({ attemptId: attempt._id, content: contentWithWords(150), idempotencyKey: "error-key" });
    await new EvaluationWorker().run(submission._id.toString());
    const updated = await Submission.findById(submission._id);
    expect(updated?.status).toBe("Failed");
    expect(updated?.failureReason).toBe("Gemini unavailable");
  });
});
