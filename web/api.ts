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

export async function getAttempts(problemId: string): Promise<Attempt[]> {
  const response = await request<{ items: Attempt[] }>(`/api/attempts?problemId=${encodeURIComponent(problemId)}`);
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