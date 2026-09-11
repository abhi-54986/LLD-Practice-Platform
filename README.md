# LLD Practice Platform

LLD Practice Platform is a prototype practice and review tool for low-level design problems. Learners choose one of five seeded problems, write a structured Markdown design, submit it for deterministic checks and Gemini evaluation, and review evidence-based scores across eight design dimensions. The prototype uses a single mock learner and a real MongoDB-backed Express API with a React/Vite frontend.

## Prerequisites

- Node.js 20 or newer. The project does not currently pin a Node version in `package.json`.
- MongoDB running locally, or a MongoDB Atlas connection URI.
- A Gemini API key with access to the configured flash model.

## Setup

This repository has one root `package.json` and one root `.env.example`; `src/` and `web/` are source directories, not separate packages.

Install all backend and frontend dependencies from the repository root:

```powershell
npm install
```

Create the local environment file from the root template:

```powershell
Copy-Item .env.example .env
```

Edit `.env` and provide your values:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/lld-practice-platform
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-3.6-flash
```

`GEMINI_MODEL` is read by the backend AI configuration. The current confirmed model is `gemini-3.6-flash`.

## Seed the Database

Start MongoDB first, then run the root seed script:

```powershell
npm run seed
```

The script idempotently seeds the Demo Learner and the five practice problems.

## Run Locally

Start the backend API from the repository root:

```powershell
npm run start
```

Start the Vite frontend in a second terminal:

```powershell
npm run frontend:dev
```

Open <http://localhost:5173> in a browser. The Vite development server proxies `/api` requests to the backend at port 3000.

To build the frontend for production:

```powershell
npm run frontend:build
```

To type-check the backend and shared TypeScript:

```powershell
npm run build
```

## Run Tests

Run the backend Vitest suite, including MongoDB integration tests:

```powershell
npm test
```

The exact script is `vitest run`, as defined in the root `package.json`. Frontend tests are not currently configured.

## Known Limitations

These limitations are taken from [DESIGN_NOTE.md §11 — Trade-offs & Limitations](DESIGN_NOTE.md#11-trade-offs--limitations):

- Text-only submission means the platform cannot yet evaluate an actual class-diagram's visual structure — §8 shows the seam, but it is not built.
- Single mock learner means there's no real multi-user isolation guarantee yet — the schema is ref-ready (`learnerId` everywhere) but auth enforcement is not implemented.
- In-process job runner (A4) means evaluation jobs are lost on a server restart mid-evaluation — acceptable for a 2-day prototype, called out explicitly as the first thing to fix with a real queue (§9).
- One rubric version is live at a time; no side-by-side rubric A/B testing.

## More Detail

- [RESEARCH_NOTE.md](RESEARCH_NOTE.md) — product research and problem framing
- [DESIGN_NOTE.md](DESIGN_NOTE.md) — locked architecture, domain model, API, evaluation, and limitations
- [UIUX_DESIGN.md](UIUX_DESIGN.md) — interface tokens, components, screens, and responsive behavior
- [AI_USAGE.md](AI_USAGE.md) — consequential AI-assisted design and implementation decisions
