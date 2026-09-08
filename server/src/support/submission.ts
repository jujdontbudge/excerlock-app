import { randomUUID } from "node:crypto";
import type { SupportCategory } from "@excerlock/analytics-events";
import type {
  NewSupportSubmissionRecord,
  SupportSubmissionRepository,
} from "./repository.js";
import { SupportUserNotFoundError } from "./errors.js";

/**
 * The form is the whole feature (B17). An "idea" submission is stored and
 * answered like any other; nothing is published back for other users to vote
 * on, so no second record is written.
 */
export type SupportSubmissionInput =
  | Readonly<{
      category: "support" | "bug";
      message: string;
    }>
  | Readonly<{
      category: "feature";
      title: string;
      message: string;
    }>;

export type SupportSubmissionResult = Readonly<{ submissionId: string }>;

export interface SupportSubmissionAnalytics {
  supportRequestSubmitted(
    userId: string,
    category: SupportCategory,
  ): void;
}

export interface SupportSubmissionServiceOptions {
  repository: SupportSubmissionRepository;
  analytics: SupportSubmissionAnalytics;
  now?: () => Date;
  randomId?: () => string;
}

export interface SupportSubmissionService {
  submit(
    userId: string,
    input: SupportSubmissionInput,
  ): Promise<SupportSubmissionResult>;
}

export function createSupportSubmissionService(
  options: SupportSubmissionServiceOptions,
): SupportSubmissionService {
  const now = options.now ?? (() => new Date());
  const randomId = options.randomId ?? randomUUID;

  return {
    async submit(userId, input) {
      if (!(await options.repository.userExists(userId))) {
        throw new SupportUserNotFoundError(userId);
      }

      const submission: NewSupportSubmissionRecord = {
        id: randomId(),
        userId,
        category: input.category,
        title: input.category === "feature" ? input.title : null,
        message: input.message,
        createdAt: now(),
      };

      await options.repository.insertSupportSubmission(submission);
      options.analytics.supportRequestSubmitted(userId, input.category);

      return { submissionId: submission.id };
    },
  };
}
