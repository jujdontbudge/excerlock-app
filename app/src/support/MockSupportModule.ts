import {
  SystemSupportClock,
  type SupportClock,
} from "./clock";
import type {
  FeatureRequest,
  SubmitSupportResult,
  SupportError,
  SupportModule,
  SupportSnapshot,
  SupportStateListener,
  SupportSubmission,
  SupportUnsubscribe,
  VoteOnFeatureRequestResult,
} from "./SupportModule";

const INITIAL_SNAPSHOT: SupportSnapshot = Object.freeze({
  submissions: Object.freeze([]),
  featureRequests: Object.freeze([]),
});

type MockSupportModuleOptions = Readonly<{
  clock?: SupportClock;
}>;

type MockSubmissionResult =
  | "submitted"
  | Readonly<{
      status: "failed";
      code: SupportError["code"];
      message: string;
    }>;

const OFFLINE_ERROR: SupportError = Object.freeze({
  code: "offline",
  message:
    "You're offline. This wasn't sent. It is saved here so you can try again.",
});

export class MockSupportModule implements SupportModule {
  private readonly clock: SupportClock;
  private nextSupportId = 1;
  private nextFeatureId = 1;
  private snapshot = INITIAL_SNAPSHOT;
  private nextSubmissionResult: MockSubmissionResult = "submitted";
  private online = true;
  private readonly listeners = new Set<SupportStateListener>();

  public constructor(options: MockSupportModuleOptions = {}) {
    this.clock = options.clock ?? new SystemSupportClock();
  }

  public async getSnapshot(): Promise<SupportSnapshot> {
    return this.snapshot;
  }

  public async submitSupport(
    request: Readonly<{ message: string }>,
  ): Promise<SubmitSupportResult> {
    const submission: SupportSubmission = Object.freeze({
      id: `support-${this.nextSupportId++}`,
      kind: "support",
      title: null,
      message: request.message.trim(),
      createdAtMs: this.clock.nowMs(),
      status: "submitting",
      error: null,
    });
    return this.attemptSubmission(submission);
  }

  public async submitFeatureRequest(
    request: Readonly<{ title: string; message: string }>,
  ): Promise<SubmitSupportResult> {
    const submissionId = `feature-${this.nextFeatureId++}`;
    const submission: SupportSubmission = Object.freeze({
      id: submissionId,
      kind: "feature",
      title: request.title.trim(),
      message: request.message.trim(),
      createdAtMs: this.clock.nowMs(),
      status: "submitting",
      error: null,
    });
    const featureRequest: FeatureRequest = Object.freeze({
      id: submissionId,
      title: submission.title,
      message: submission.message,
      voteCount: 0,
      hasVoted: false,
      submissionId,
    });
    this.publish({
      ...this.snapshot,
      featureRequests: Object.freeze([
        ...this.snapshot.featureRequests,
        featureRequest,
      ]),
    });
    return this.attemptSubmission(submission);
  }

  public async retrySubmission(
    submissionId: string,
  ): Promise<SubmitSupportResult> {
    const submission = this.snapshot.submissions.find(
      (candidate) => candidate.id === submissionId,
    );
    if (submission === undefined) {
      throw new Error(`Unknown support submission: ${submissionId}`);
    }
    if (submission.status === "submitted") {
      return Object.freeze({ status: "submitted", submissionId });
    }

    return this.attemptSubmission(
      Object.freeze({
        ...submission,
        status: "submitting",
        error: null,
      }),
    );
  }

  public async voteOnFeatureRequest(
    featureRequestId: string,
  ): Promise<VoteOnFeatureRequestResult> {
    const featureRequest = this.snapshot.featureRequests.find(
      (candidate) => candidate.id === featureRequestId,
    );
    if (featureRequest === undefined) {
      throw new Error(`Unknown feature request: ${featureRequestId}`);
    }
    if (featureRequest.hasVoted) {
      return Object.freeze({
        status: "alreadyVoted",
        featureRequestId,
        voteCount: featureRequest.voteCount,
      });
    }

    const votedFeatureRequest: FeatureRequest = Object.freeze({
      ...featureRequest,
      voteCount: featureRequest.voteCount + 1,
      hasVoted: true,
    });
    this.publish({
      ...this.snapshot,
      featureRequests: Object.freeze(
        this.snapshot.featureRequests.map((current) =>
          current.id === featureRequestId ? votedFeatureRequest : current,
        ),
      ),
    });
    return Object.freeze({
      status: "voted",
      featureRequestId,
      voteCount: votedFeatureRequest.voteCount,
    });
  }

  private async attemptSubmission(
    submission: SupportSubmission,
  ): Promise<SubmitSupportResult> {
    this.saveSubmission(submission);
    await Promise.resolve();
    if (!this.online) {
      this.replaceSubmission({
        ...submission,
        status: "failed",
        error: OFFLINE_ERROR,
      });
      return Object.freeze({
        status: "failed",
        submissionId: submission.id,
        error: OFFLINE_ERROR,
      });
    }
    if (typeof this.nextSubmissionResult === "object") {
      const error: SupportError = Object.freeze({
        code: this.nextSubmissionResult.code,
        message: this.nextSubmissionResult.message,
      });
      this.replaceSubmission({
        ...submission,
        status: "failed",
        error,
      });
      return Object.freeze({
        status: "failed",
        submissionId: submission.id,
        error,
      });
    }

    this.replaceSubmission({
      ...submission,
      status: "submitted",
    });
    return Object.freeze({
      status: "submitted",
      submissionId: submission.id,
    });
  }

  /** Deterministic mock driver; not part of the app-facing interface. */
  public setNextSubmissionResult(result: MockSubmissionResult): void {
    this.nextSubmissionResult = result;
  }

  /** Deterministic mock driver; not part of the app-facing interface. */
  public setOnline(online: boolean): void {
    this.online = online;
  }

  public subscribe(listener: SupportStateListener): SupportUnsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private replaceSubmission(submission: SupportSubmission): void {
    this.publish({
      ...this.snapshot,
      submissions: Object.freeze(
        this.snapshot.submissions.map((current) =>
          current.id === submission.id ? Object.freeze(submission) : current,
        ),
      ),
    });
  }

  private saveSubmission(submission: SupportSubmission): void {
    const exists = this.snapshot.submissions.some(
      (current) => current.id === submission.id,
    );
    if (exists) {
      this.replaceSubmission(submission);
      return;
    }

    this.publish({
      ...this.snapshot,
      submissions: Object.freeze([...this.snapshot.submissions, submission]),
    });
  }

  private publish(snapshot: SupportSnapshot): void {
    this.snapshot = Object.freeze(snapshot);
    this.listeners.forEach((listener) => listener(this.snapshot));
  }
}
