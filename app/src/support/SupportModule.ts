type SupportSubmissionBase = Readonly<{
  id: string;
  kind: "support";
  title: null;
  message: string;
  createdAtMs: number;
}>;

export type SupportError = Readonly<{
  code: "service_unavailable" | "offline";
  message: string;
}>;

export type SupportSubmission = SupportSubmissionBase &
  (
    | Readonly<{ status: "submitting" | "submitted"; error: null }>
    | Readonly<{ status: "failed"; error: SupportError }>
  );

export type SupportSnapshot = Readonly<{
  submissions: readonly SupportSubmission[];
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

export type SupportStateListener = (snapshot: SupportSnapshot) => void;
export type SupportUnsubscribe = () => void;

export interface SupportModule {
  getSnapshot(): Promise<SupportSnapshot>;
  submitSupport(request: Readonly<{ message: string }>): Promise<SubmitSupportResult>;
  retrySubmission(submissionId: string): Promise<SubmitSupportResult>;
  subscribe(listener: SupportStateListener): SupportUnsubscribe;
}
