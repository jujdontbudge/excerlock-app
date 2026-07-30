type SupportSubmissionBase = Readonly<{
  id: string;
  message: string;
  createdAtMs: number;
}>;

type SupportSubmissionContent =
  | Readonly<{ kind: "support"; title: null }>
  | Readonly<{ kind: "feature"; title: string }>;

export type SupportError = Readonly<{
  code:
    | "service_unavailable"
    | "offline"
    | "request_rejected"
    | "timeout";
  message: string;
}>;

export type SupportSubmission = SupportSubmissionBase &
  SupportSubmissionContent &
  (
    | Readonly<{ status: "submitting" | "submitted"; error: null }>
    | Readonly<{ status: "failed"; error: SupportError }>
  );

export type FeatureRequest = Readonly<{
  id: string;
  title: string;
  message: string;
  voteCount: number;
  hasVoted: boolean;
  submissionId: string | null;
}>;

export type SupportSnapshot = Readonly<{
  submissions: readonly SupportSubmission[];
  featureRequests: readonly FeatureRequest[];
}>;

export type SubmitSupportResult =
  | Readonly<{
      status: "submitted";
      submissionId: string;
    }>
  | Readonly<{
      status: "failed";
      submissionId: string;
      error: SupportError;
    }>;

export type VoteOnFeatureRequestResult = Readonly<{
  status: "voted" | "alreadyVoted";
  featureRequestId: string;
  voteCount: number;
}>;

export type SupportStateListener = (snapshot: SupportSnapshot) => void;
export type SupportUnsubscribe = () => void;

export interface SupportModule {
  getSnapshot(): Promise<SupportSnapshot>;
  submitSupport(request: Readonly<{ message: string }>): Promise<SubmitSupportResult>;
  submitFeatureRequest(
    request: Readonly<{ title: string; message: string }>,
  ): Promise<SubmitSupportResult>;
  voteOnFeatureRequest(
    featureRequestId: string,
  ): Promise<VoteOnFeatureRequestResult>;
  retrySubmission(submissionId: string): Promise<SubmitSupportResult>;
  subscribe(listener: SupportStateListener): SupportUnsubscribe;
}
