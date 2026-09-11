export type SubmissionStatus = "Submitted" | "Evaluating" | "Completed" | "Failed";

const legalTransitions: Record<SubmissionStatus, SubmissionStatus[]> = {
  Submitted: ["Evaluating"],
  Evaluating: ["Completed", "Failed"],
  Completed: [],
  Failed: ["Evaluating"],
};

export function transitionSubmission(from: SubmissionStatus, to: SubmissionStatus): SubmissionStatus {
  if (!legalTransitions[from].includes(to)) {
    throw new Error(`Illegal submission transition: ${from} -> ${to}`);
  }
  return to;
}