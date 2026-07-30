import { randomUUID } from "node:crypto";
import type { SupportCategory } from "@excerlock/analytics-events";
import type {
  NewSupportSubmissionRecord,
  SupportSubmissionRepository,
} from "./repository.js";
import { SupportUserNotFoundError } from "./errors.js";

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

export type SupportSubmissionResult =
  | Readonly<{ submissionId: string }>
  | Readonly<{ submissionId: string; featureRequestId: string }>;

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

      const submissionId = randomId();
      const featureRequestId =
        input.category === "feature" ? randomId() : null;
      const createdAt = now();
      const submission: NewSupportSubmissionRecord = {
        id: submissionId,
        userId,
        category: input.category,
        title: input.category === "feature" ? input.title : null,
        message: input.message,
        createdAt,
        featureRequest:
          input.category === "feature"
            ? {
                id: featureRequestId!,
                title: input.title,
                message: input.message,
                createdAt,
              }
            : null,
      };

      await options.repository.insertSupportSubmission(submission);
      options.analytics.supportRequestSubmitted(userId, input.category);

      return featureRequestId
        ? { submissionId, featureRequestId }
        : { submissionId };
    },
  };
}
