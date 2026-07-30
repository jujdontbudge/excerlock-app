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

export interface FeatureRequestRecord {
  id: string;
  submissionId: string;
  title: string;
  message: string;
  voteCount: number;
  hasVoted: boolean;
  createdAt: Date;
}

export interface FeatureRequestRepository {
  userExists(userId: string): Promise<boolean>;
  listFeatureRequests(
    userId: string,
  ): Promise<readonly FeatureRequestRecord[]>;
}
