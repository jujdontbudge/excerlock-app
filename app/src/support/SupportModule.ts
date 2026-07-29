export type SupportSubmission = Readonly<{
  id: string;
  kind: "support";
  title: null;
  message: string;
  createdAtMs: number;
  status: "submitting" | "submitted";
  error: null;
}>;

export type SupportSnapshot = Readonly<{
  submissions: readonly SupportSubmission[];
}>;

export type SubmitSupportResult = Readonly<{
  status: "submitted";
  submissionId: string;
}>;

export type SupportStateListener = (snapshot: SupportSnapshot) => void;
export type SupportUnsubscribe = () => void;

export interface SupportModule {
  getSnapshot(): Promise<SupportSnapshot>;
  submitSupport(request: Readonly<{ message: string }>): Promise<SubmitSupportResult>;
  subscribe(listener: SupportStateListener): SupportUnsubscribe;
}
