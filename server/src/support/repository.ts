import type { SupportCategory } from "@excerlock/analytics-events";

export interface NewFeatureRequestRecord {
  id: string;
  title: string;
  message: string;
  createdAt: Date;
}

export interface NewSupportSubmissionRecord {
  id: string;
  userId: string;
  category: SupportCategory;
  title: string | null;
  message: string;
  createdAt: Date;
  featureRequest: NewFeatureRequestRecord | null;
}

export interface SupportSubmissionRepository {
  userExists(userId: string): Promise<boolean>;
  insertSupportSubmission(
    submission: NewSupportSubmissionRecord,
  ): Promise<void>;
}
