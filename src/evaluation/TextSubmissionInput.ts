import { InferSchemaType } from "mongoose";
import { Problem, ProblemSchema } from "../models/Problem.js";
import { Submission, SubmissionSchema } from "../models/Submission.js";
import { IEvaluationInput, ProblemContext } from "./IEvaluationInput.js";

export class TextSubmissionInput implements IEvaluationInput {
  constructor(
    private readonly submission: InferSchemaType<typeof SubmissionSchema>,
    private readonly problem: InferSchemaType<typeof ProblemSchema>,
  ) {}

  getEvaluableText(): string {
    return this.submission.content;
  }

  getProblemContext(): ProblemContext {
    return {
      requirements: this.problem.requirementsMd,
      constraints: this.problem.constraints,
    };
  }
}