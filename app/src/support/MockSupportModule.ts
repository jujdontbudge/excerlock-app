import {
  SystemSupportClock,
  type SupportClock,
} from "./clock";
import type {
  SubmitSupportResult,
  SupportModule,
  SupportSnapshot,
  SupportStateListener,
  SupportSubmission,
  SupportUnsubscribe,
} from "./SupportModule";

const INITIAL_SNAPSHOT: SupportSnapshot = Object.freeze({
  submissions: Object.freeze([]),
});

type MockSupportModuleOptions = Readonly<{
  clock?: SupportClock;
}>;

export class MockSupportModule implements SupportModule {
  private readonly clock: SupportClock;
  private nextSupportId = 1;
  private snapshot = INITIAL_SNAPSHOT;
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
    this.publish({
      submissions: Object.freeze([...this.snapshot.submissions, submission]),
    });
    await Promise.resolve();
    this.replaceSubmission({
      ...submission,
      status: "submitted",
    });
    return Object.freeze({
      status: "submitted",
      submissionId: submission.id,
    });
  }

  public subscribe(listener: SupportStateListener): SupportUnsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private replaceSubmission(submission: SupportSubmission): void {
    this.publish({
      submissions: Object.freeze(
        this.snapshot.submissions.map((current) =>
          current.id === submission.id ? Object.freeze(submission) : current,
        ),
      ),
    });
  }

  private publish(snapshot: SupportSnapshot): void {
    this.snapshot = Object.freeze(snapshot);
    this.listeners.forEach((listener) => listener(this.snapshot));
  }
}
