import { randomUUID } from "node:crypto";
import type { SupportCategory } from "@excerlock/analytics-events";
import {
  canonicalCategory,
  type SupportSubmissionRequest,
} from "./payload.js";
import type {
  NewSupportSubmissionRecord,
  SupportSubmissionRepository,
} from "./repository.js";
import { SupportUserNotFoundError } from "./errors.js";

/**
 * The form is the whole feature (B17). An idea is stored and answered like any
 * other submission; nothing is published back for other users to vote on, so
 * no second record is written.
 */
export type SupportSubmissionInput = SupportSubmissionRequest;

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

      // One vocabulary crosses this line: the wire's product words become the
      // analytics registry's enum here and nowhere else.
      const category = canonicalCategory(input.category);
      const submission: NewSupportSubmissionRecord = {
        id: randomId(),
        userId,
        category,
        title: input.title ?? null,
        message: input.message,
        replyTo: input.replyTo ?? null,
        diagnostics: input.diagnostics ?? null,
        createdAt: now(),
      };

      await options.repository.insertSupportSubmission(submission);
      options.analytics.supportRequestSubmitted(userId, category);

      return { submissionId: submission.id };
    },
  };
}
