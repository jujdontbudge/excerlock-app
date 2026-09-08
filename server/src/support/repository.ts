import type { SupportCategory } from "@excerlock/analytics-events";
import type { SupportDiagnostics } from "./payload.js";

export interface NewSupportSubmissionRecord {
  id: string;
  userId: string;
  category: SupportCategory;
  title: string | null;
  message: string;
  /** Where a human answers. Null when the user gave no address. */
  replyTo: string | null;
  /** Privacy-floored device context, or null from a client that sends none. */
  diagnostics: SupportDiagnostics | null;
  createdAt: Date;
}

export interface SupportSubmissionRepository {
  userExists(userId: string): Promise<boolean>;
  insertSupportSubmission(
    submission: NewSupportSubmissionRecord,
  ): Promise<void>;
}
