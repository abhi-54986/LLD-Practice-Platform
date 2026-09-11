export type Problem = {
  _id: string;
  title: string;
  slug: string;
  difficulty: "Easy" | "Medium" | "Hard";
  requirementsMd: string;
  constraints: string[];
  tags: string[];
};

export type Attempt = {
  _id: string;
  problemId: string;
  status: string;
  startedAt: string;
  problem?: Problem;
  submission?: { _id: string; status: string };
  evaluation?: Evaluation;
};

export type DimensionScore = {
  dimension: string;
  score: number;
  evidence: string;
  concern?: string;
  suggestion: string;
};

export type Evaluation = {
  evaluatorType: "ai" | "deterministic-only";
  deterministicChecks: Record<string, boolean>;
  dimensionScores?: DimensionScore[];
  overallSummary?: string;
  confidence?: number;
};

export type SubmissionStatus = {
  status: "Submitted" | "Evaluating" | "Completed" | "Failed";
  failureReason?: string;
  evaluation?: Evaluation;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error?.message ?? "The request could not be completed");
  }
  return body as T;
}

export async function getProblems(): Promise<Problem[]> {
  const response = await request<{ items: Problem[] }>("/api/problems");
  return response.items;
}

export function getProblem(id: string): Promise<Problem> {
  return request<Problem>(`/api/problems/${id}`);
}

export async function getAttempts(problemId?: string): Promise<Attempt[]> {
  const query = problemId ? `?problemId=${encodeURIComponent(problemId)}` : "";
  const response = await request<{ items: Attempt[] }>(`/api/attempts${query}`);
  return response.items;
}

export function startAttempt(problemId: string): Promise<Attempt> {
  return request<Attempt>("/api/attempts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ problemId }),
  });
}

export function submitDesign(attemptId: string, content: string): Promise<{ submissionId: string; status: string }> {
  return request(`/api/attempts/${attemptId}/submissions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, idempotencyKey: crypto.randomUUID() }),
  });
}

export function getSubmissionStatus(id: string): Promise<SubmissionStatus> {
  return request<SubmissionStatus>(`/api/submissions/${id}`);
}

export function retryEvaluation(id: string): Promise<{ status: string }> {
  return request(`/api/submissions/${id}/retry-evaluation`, { method: "POST" });
}