import type { SupportCategory } from "@excerlock/analytics-events";

export interface NewSupportSubmissionRecord {
  id: string;
  userId: string;
  category: SupportCategory;
  title: string | null;
  message: string;
  createdAt: Date;
}

export interface SupportSubmissionRepository {
  userExists(userId: string): Promise<boolean>;
  insertSupportSubmission(
    submission: NewSupportSubmissionRecord,
  ): Promise<void>;
}
