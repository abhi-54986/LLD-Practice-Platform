import { useEffect, useMemo, useState } from "react";
import { Button, Panel, StatusPill, Textarea } from "./components";
import { getAttempts, getProblem, getProblems, Problem, startAttempt, submitDesign } from "./api";

const scaffold = `## Requirements Understanding

## Classes & Responsibilities

## Relationships

## Trade-offs & Assumptions
`;

const requiredSections = [
  "Requirements Understanding",
  "Classes & Responsibilities",
  "Relationships",
  "Trade-offs & Assumptions",
];

export function App() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState("All");
  const [tag, setTag] = useState("All");
  const [mobileRailOpen, setMobileRailOpen] = useState(false);
  const selectedProblem = selectedId ? <Workspace key={selectedId} problemId={selectedId} onBack={() => setSelectedId(null)} /> : null;

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setSelectedId(null)} aria-label="Go to problem list">
          <span className="brand-mark">LLD</span>
          <span>Practice review</span>
        </button>
        {selectedId && (
          <Button variant="secondary" className="mobile-menu" onClick={() => setMobileRailOpen(!mobileRailOpen)}>
            Problems
          </Button>
        )}
        <nav className="topnav" aria-label="Main navigation">
          <span className="topnav__current">Problems</span>
          <span>Single learner</span>
        </nav>
      </header>
      <div className={`workspace-layout ${mobileRailOpen ? "workspace-layout--rail-open" : ""}`}>
        <ProblemRail selectedId={selectedId} difficulty={difficulty} tag={tag} onDifficultyChange={setDifficulty} onTagChange={setTag} onSelect={(id) => { setSelectedId(id); setMobileRailOpen(false); }} />
        {selectedProblem ?? <ProblemList difficulty={difficulty} tag={tag} onSelect={setSelectedId} />}
        {selectedId && <div className="workspace-layout__empty" aria-hidden="true" />}
      </div>
    </div>
  );
}

function ProblemRail({ selectedId, difficulty, tag, onDifficultyChange, onTagChange, onSelect }: { selectedId: string | null; difficulty: string; tag: string; onDifficultyChange: (value: string) => void; onTagChange: (value: string) => void; onSelect: (id: string) => void }) {
  const [problems, setProblems] = useState<Problem[]>([]);
  const tags = [...new Set(problems.flatMap((problem) => problem.tags))].sort();
  useEffect(() => { getProblems().then(setProblems).catch(() => undefined); }, []);
  return (
    <aside className="context-rail">
      <div className="rail-heading">
        <span className="eyebrow">Practice set</span>
        <strong>{problems.length || "..."} problems</strong>
      </div>
      <div className="rail-filter">
        <label htmlFor="difficulty-filter">Difficulty</label>
        <select id="difficulty-filter" value={difficulty} onChange={(event) => onDifficultyChange(event.target.value)}>
          <option>All</option>
          <option>Easy</option>
          <option>Medium</option>
          <option>Hard</option>
        </select>
        <label htmlFor="tag-filter">Tag</label>
        <select id="tag-filter" value={tag} onChange={(event) => onTagChange(event.target.value)}>
          <option>All</option>
          {tags.map((value) => <option key={value}>{value}</option>)}
        </select>
      </div>
      <div className="rail-list">
        {problems.map((problem) => (
          <button key={problem._id} className={`rail-row ${selectedId === problem._id ? "rail-row--selected" : ""}`} onClick={() => onSelect(problem._id)}>
            <span>{problem.title}</span>
            <StatusPill tone={problem.difficulty.toLowerCase()}>{problem.difficulty}</StatusPill>
          </button>
        ))}
      </div>
    </aside>
  );
}

function ProblemList({ difficulty, tag, onSelect }: { difficulty: string; tag: string; onSelect: (id: string) => void }) {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [attemptCounts, setAttemptCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const filteredProblems = problems.filter((problem) => (difficulty === "All" || problem.difficulty === difficulty) && (tag === "All" || problem.tags.includes(tag)));

  useEffect(() => {
    getProblems().then(async (items) => {
      setProblems(items);
      const attempts = await Promise.all(items.map(async (problem) => [problem._id, (await getAttempts(problem._id)).length] as const));
      setAttemptCounts(Object.fromEntries(attempts));
    }).catch((cause: Error) => setError(cause.message)).finally(() => setLoading(false));
  }, []);

  return (
    <main className="primary-surface list-surface">
      <div className="page-intro">
        <div>
          <span className="eyebrow">Design practice</span>
          <h1>Choose a problem</h1>
          <p>Work through a low-level design and get evidence-based feedback on your decisions.</p>
        </div>
        <span className="list-count">{problems.length ? `${filteredProblems.length} available` : ""}</span>
      </div>
      {error && <p className="error-message" role="alert">{error}</p>}
      {loading ? <LoadingRows /> : filteredProblems.length === 0 ? <p className="empty-state">No problems available yet</p> : (
        <div className="problem-list" aria-label="Problems">
          {filteredProblems.map((problem, index) => (
            <button className="problem-row" key={problem._id} onClick={() => onSelect(problem._id)}>
              <span className="problem-row__index">{String(index + 1).padStart(2, "0")}</span>
              <span className="problem-row__main"><strong>{problem.title}</strong><span>{problem.tags.slice(0, 2).join(" · ")}</span></span>
              <StatusPill tone={problem.difficulty.toLowerCase()}>{problem.difficulty}</StatusPill>
              <span className="problem-row__stats"><small>Attempts</small><strong>{attemptCounts[problem._id] ?? "—"}</strong></span>
              <span className="problem-row__stats"><small>Best score</small><strong>{attemptCounts[problem._id] ? "No score yet" : "—"}</strong></span>
              <span className="row-arrow" aria-hidden="true">↗</span>
            </button>
          ))}
        </div>
      )}
    </main>
  );
}

function LoadingRows() {
  return <div className="problem-list" aria-label="Loading problems">{[1, 2, 3, 4, 5].map((row) => <div className="skeleton-row" key={row}><span /><span /><span /><span /></div>)}</div>;
}

function Workspace({ problemId, onBack }: { problemId: string; onBack: () => void }) {
  const [problem, setProblem] = useState<Problem | null>(null);
  const [content, setContent] = useState(scaffold);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [requirementsOpen, setRequirementsOpen] = useState(true);
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const missingSections = useMemo(() => requiredSections.filter((section) => !sectionHasContent(content, section)), [content]);
  const canSubmit = missingSections.length === 0 && !submitted;

  useEffect(() => { getProblem(problemId).then(setProblem).catch((cause: Error) => setError(cause.message)); }, [problemId]);
  useEffect(() => { if (content !== scaffold) setRequirementsOpen(false); }, [content]);

  async function handleSubmit() {
    if (!canSubmit) return;
    try {
      setError("");
      const attempt = await startAttempt(problemId);
      setAttemptId(attempt._id);
      await submitDesign(attempt._id, content);
      setSubmitted(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Submission failed");
    }
  }

  if (!problem) return <main className="primary-surface workspace-surface"><div className="loading-line" />{error && <p className="error-message">{error}</p>}</main>;
  return (
    <main className="primary-surface workspace-surface">
      <button className="back-link" onClick={onBack}>← All problems</button>
      <div className="workspace-heading"><div><span className="eyebrow">{problem.difficulty} problem</span><h1>{problem.title}</h1></div><StatusPill tone={problem.difficulty.toLowerCase()}>{problem.difficulty}</StatusPill></div>
      <Panel className={`requirements-panel ${requirementsOpen ? "requirements-panel--open" : ""}`}>
        <button className="requirements-toggle" onClick={() => setRequirementsOpen(!requirementsOpen)} aria-expanded={requirementsOpen}><span>Requirements</span><span>{requirementsOpen ? "Hide" : "Show"}</span></button>
        {requirementsOpen && <div className="requirements-content"><p>{problem.requirementsMd}</p><ul>{problem.constraints.map((constraint) => <li key={constraint}>{constraint}</li>)}</ul></div>}
      </Panel>
      <div className="editor-header"><div><span className="eyebrow">Your design</span><h2>Write the reviewable version</h2></div><span className="word-count">{wordCount} words</span></div>
      <Textarea value={content} onChange={(event) => setContent(event.target.value)} aria-label="Design submission" spellCheck={false} />
      <div className="editor-footer"><div aria-live="polite">{missingSections.length > 0 && <span className="hint">Missing: {missingSections.join(", ")}</span>}{submitted && <span className="success-message">Design submitted for evaluation.</span>}{error && <span className="error-message">{error}</span>}</div><Button onClick={handleSubmit} disabled={!canSubmit}>{submitted ? "Submitted" : "Submit design"}</Button></div>
      {attemptId && <span className="submission-note">Attempt created · submission queued</span>}
    </main>
  );
}

function sectionHasContent(text: string, section: string) {
  const marker = `## ${section}`;
  const start = text.indexOf(marker);
  if (start === -1) return false;
  const nextHeading = text.indexOf("\n## ", start + marker.length);
  return text.slice(start + marker.length, nextHeading === -1 ? text.length : nextHeading).trim().length > 0;
}