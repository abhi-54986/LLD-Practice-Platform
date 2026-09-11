export type ProblemContext = {
  requirements: string;
  constraints: string[];
};

export interface IEvaluationInput {
  getEvaluableText(): string;
  getProblemContext(): ProblemContext;
}