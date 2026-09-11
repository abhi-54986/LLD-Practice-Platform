# Agent Instructions — LLD Practice Platform

Read these before writing any code, in this order:
1. docs/DESIGN_NOTE.md — source of truth for every schema, interface, API route, and locked assumption. Do not deviate from its "Locked Assumptions" table without flagging it first.
2. docs/UIUX_DESIGN.md — source of truth for every color/type/spacing token and component spec on the frontend. Do not substitute default Tailwind/shadcn styling for what's defined here.
3. docs/RESEARCH_NOTE.md — background context only, not implementation-binding.

## Rules
- Stack is locked: MongoDB, Express, React (TypeScript), Node.js — TypeScript throughout.
- Never invent a decision not already in DESIGN_NOTE.md. If something genuinely isn't covered, stop and ask instead of guessing.
- Match the Mongoose schemas in DESIGN_NOTE.md §3.2 field-for-field, including indexes.
- Match the API table in §6 route-for-route, including status codes and the shared error shape.
- Follow the evaluation interfaces in §4 (IEvaluator, IEvaluationInput, EvaluatorFactory) exactly — don't hardcode the Gemini call directly into a service or controller.
- Frontend must use the tokens and components from UIUX_DESIGN.md §2–§3, not default component-library styling.
- Build strictly in the phase order given in each task prompt — don't jump ahead to a later phase in the same session.