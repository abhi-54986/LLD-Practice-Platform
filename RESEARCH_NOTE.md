# Research Note — LLD Practice Platform

## 1. The Learner Problem

A learner can sit down and design a Parking Lot or an Elevator System without much friction — the hard part isn't producing *a* design, it's knowing whether the design is *good*. Two learners can submit completely different class breakdowns for the same problem and both be defensible. Without a way to check responsibilities, coupling, abstraction choices, and extensibility against something more structured than "does it compile" or "does it look like the reference," a learner gets no real signal on what to fix before the next attempt — and no way to see whether they're making the same mistake (e.g., leaking business logic into a controller class) across different problems.

## 2. Existing Approaches Researched

| Tool | Practice workflow | Submission | Feedback | Learning loop |
|---|---|---|---|---|
| [LLDCanvas](https://www.lldcanvas.in/) | UML class-diagram editor with 23 pre-wired design-pattern skeletons, SOLID notes, and staged hints unlocked one at a time | Diagram + notes | Timed-practice analytics and community discussion threads per problem | Per-problem analytics, but discussion is peer/community-driven rather than a scored evaluation of the learner's own design choices |
| [Low Level Design Mastery](https://www.lowleveldesignmastery.com/) | Guided "Pick Problem → Draw Diagram → Write Code → Get AI Feedback" flow, problems in six languages | Diagram + runnable code | AI-powered code review | Closest existing analog to a submit-and-get-feedback loop; feedback centers on code review rather than an explicit, multi-dimension design rubric with evidence attached |
| [lldcoding.com](https://www.preplaced.in/blog/how-to-crack-low-lev-85) and the community-curated [`awesome-low-level-design`](https://converter.brightcoding.dev/blog/awesome-low-level-design-the-essential-lld-interview-toolkit) GitHub repo | Browse a curated problem list with step-by-step reference solutions | None — read-only | None — learner compares their own work to the reference solution manually | No submission or feedback loop at all; effectively a study library, not a practice platform |

A broader pattern from current literature on rubric-based AI evaluation of open-ended work: the field has converged on **expert-authored, per-domain rubric criteria evaluated by an LLM judge** as the standard approach for scoring open-ended output where there's no single correct answer — and separately, a comparison of LLM-generated feedback against human TAs found LLM feedback performs best when it explicitly acknowledges what's correct, names a specific flaw, and gives actionable guidance, rather than an unscored summary. Both points directly shaped the evaluation design in the accompanying Design Note (see `DESIGN_NOTE.md` §5).

## 3. Key Gaps

1. **Reference-solution bias.** The tools with any feedback mechanism (LLDCanvas, Low Level Design Mastery) lean on pattern-matching against known-good structures or community discussion rather than evaluating the learner's *specific* responsibility and coupling choices on their own terms — which is exactly the trap the assignment brief warns against ("avoid treating a reference solution as the only correct answer").
2. **Feedback opacity.** Where AI feedback exists, it's presented as review commentary or a code-review pass, not as a fixed set of scored dimensions with evidence attached. A learner can't easily tell *which* part of their design triggered a given verdict, which limits how actionable the feedback is.
3. **No cross-problem learning signal.** Every surveyed tool tracks progress per problem (solved/unsolved, time, score) but none surfaces a *recurring weakness* across different problems — e.g., "you've now been marked down on coupling in 3 of your last 4 attempts." Attempts are treated as isolated events rather than a longitudinal signal a learner can act on.

## 4. Product Direction

Build a narrow prototype that closes these three gaps specifically, rather than competing on breadth of problems or diagram tooling:

- **Fixed, visible rubric** — the same 8 dimensions (from the assignment brief) scored every time, never a single opaque "design score."
- **Evidence-anchored feedback** — every dimension score is paired with a reference to the learner's own text, a named concern, and a concrete suggestion (see Design Note §5.2).
- **History that shows the pattern, not just the log** — attempt history is queryable across problems for one learner, not only within a single problem, so recurring weaknesses are visible (Design Note §3, `AttemptService.getHistory`).

Everything else — diagram submission, multiple evaluators, real auth — is deliberately deferred and designed only at the seam level (Design Note §8), consistent with the assignment's instruction to build a narrow, working MVP rather than a broad, half-working one.
