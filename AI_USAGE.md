# AI_USAGE.md

AI (Claude, via chat, then Codex for implementation) was used throughout this project's design and build. Below are the five most consequential AI-assisted decisions — what was suggested, what was accepted or rejected, and why.

## 1. Strategy-pattern evaluator instead of a hardcoded evaluation function

**Suggested:** an `IEvaluator` / `IEvaluationInput` interface pair with an `EvaluatorFactory`, rather than a single function that directly calls an LLM API inside the submission service.

**Accepted as-is.** This was proposed specifically to satisfy the assignment's second change test ("add a rule-based evaluator or human review without rewriting the practice flow"). It paid off sooner than expected: when the evaluator's LLM provider was swapped from Claude to Gemini mid-build (see #4), only `AIEvaluator`'s internal client changed — `SubmissionService`, the API routes, and the state machine were untouched. That real swap validated the abstraction was worth the extra indirection rather than being speculative pattern-use for its own sake.

## 2. Structured, text-only submission format for the MVP

**Suggested:** restrict the MVP submission format to structured text (fixed Markdown sections: requirements understanding, classes & responsibilities, relationships, trade-offs) rather than supporting diagrams or code.

**Accepted.** The assignment explicitly asks for "the smallest format that gives enough evidence of design quality," and text is the cheapest to both produce and evaluate in a 2-day window. Diagram support was deliberately left unbuilt but designed for at the interface level (`IEvaluationInput`) so it's a documented extension point (change test A), not a gap discovered later.

## 3. Rejected: a multi-agent or multi-step AI evaluation pipeline

**Suggested and rejected:** early discussion considered scoring each of the 8 rubric dimensions with a separate model call (or a multi-agent setup) for higher-quality per-dimension feedback.

**Rejected** in favor of a single call returning all 8 dimensions as one structured JSON response. The assignment explicitly warns against needing "a sophisticated AI pipeline," and a single structured call is both cheaper (relevant once cost became a factor, see #4) and easier to test deterministically — the mocked-client unit tests for retry/failure behavior would have been substantially more complex against a multi-call pipeline.

## 4. Switching the evaluator from Claude to Gemini mid-build

**Suggested:** after the architecture was locked around a generic `IEvaluator`, the LLM provider was changed from Claude to Google's Gemini API specifically to use its free tier and avoid ongoing API cost during development.

**Accepted**, and used as a live test of decision #1: the swap touched only `AIEvaluator`'s client and the `GEMINI_API_KEY`/model config — no changes to the submission flow, routes, or schemas. It also surfaced a real transient failure (a Gemini `503 UNAVAILABLE` during testing) that exercised the `Failed → retry-evaluation` path exactly as designed, rather than that path only being tested against a mocked failure.

## 5. Rejected: separate `Feedback` and `Rubric` database collections

**Suggested and rejected:** the initial domain sketch (following the assignment's own example list of "Problem, Attempt, Submission, Evaluation, Rubric, Feedback") considered modeling `Feedback` and `Rubric` as their own Mongoose collections alongside `Evaluation`.

**Rejected.** `Feedback` would have duplicated `Evaluation`'s data with no independent lifecycle or write path — it's the learner-facing rendering of an `Evaluation`, not a separate fact. `Rubric` is a versioned constant in code (tracked only via a `rubricVersion` string on `Evaluation`), not user-editable data this MVP needs to support. Both decisions were direct responses to the assignment's warning against "design patterns added only to show pattern knowledge" — this was AI recommending *less* schema, not more, and that recommendation was kept.
