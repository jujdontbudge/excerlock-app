import type { StateStorage } from "zustand/middleware";

import { SystemSupportClock, type SupportClock } from "./clock";
import {
  appendFeatureRequest,
  EMPTY_SUPPORT_SNAPSHOT,
  makeFeatureSubmission,
  makeSupportSubmission,
  saveSubmission,
} from "./mockState";
import { createMockSupportPersistence } from "./mockStore";
import {
  isSupportRequestTimeout,
  SupportHttpClient,
  type SupportFetch,
  type SupportHttpResponse,
} from "./SupportHttpClient";
import type {
  SubmitSupportResult,
  SupportError,
  SupportModule,
  SupportSnapshot,
  SupportStateListener,
  SupportSubmission,
  SupportUnsubscribe,
  VoteOnFeatureRequestResult,
} from "./SupportModule";
import {
  readFeatureRequests,
  readFeatureVote,
  readSubmissionReceipt,
  type SupportSubmissionReceipt,
} from "./supportServerContract";

export type HttpSupportModuleOptions = Readonly<{
  baseUrl: string;
  clock?: SupportClock;
  fetch?: SupportFetch;
  getAccessToken(): Promise<string | null>;
  requestTimeoutMs?: number;
  storage?: StateStorage<Promise<void>>;
}>;

const REQUEST_TIMEOUT_MS = 10_000;
const OFFLINE_ERROR: SupportError = Object.freeze({
  code: "offline",
  message:
    "You're offline. This wasn't sent. It is saved here so you can try again.",
});
const TIMEOUT_ERROR: SupportError = Object.freeze({
  code: "timeout",
  message:
    "The request timed out. This wasn't sent. It is saved here so you can try again.",
});
const SERVICE_UNAVAILABLE_ERROR: SupportError = Object.freeze({
  code: "service_unavailable",
  message:
    "Support is temporarily unavailable. This wasn't sent. It is saved here so you can try again.",
});
const REQUEST_REJECTED_ERROR: SupportError = Object.freeze({
  code: "request_rejected",
  message:
    "The server couldn't accept this request. It wasn't sent. Check it and submit a new request.",
});

export class HttpSupportModule implements SupportModule {
  private readonly clock: SupportClock;
  private readonly http: SupportHttpClient;
  private readonly listeners = new Set<SupportStateListener>();
  private readonly persistence: ReturnType<typeof createMockSupportPersistence>;
  private readonly ready: Promise<void>;
  private nextLocalId = 1;
  private snapshot = EMPTY_SUPPORT_SNAPSHOT;

  public constructor(options: HttpSupportModuleOptions) {
    this.clock = options.clock ?? new SystemSupportClock();
    this.http = new SupportHttpClient({
      baseUrl: options.baseUrl,
      fetch: options.fetch ?? globalThis.fetch,
      getAccessToken: options.getAccessToken,
      requestTimeoutMs: options.requestTimeoutMs ?? REQUEST_TIMEOUT_MS,
    });
    this.persistence = createMockSupportPersistence(options.storage);
    this.ready = this.persistence.load().then((snapshot) => {
      this.snapshot = snapshot;
      this.nextLocalId = snapshot.submissions.length + 1;
    });
  }

  public async getSnapshot(): Promise<SupportSnapshot> {
    await this.ready;
    return this.snapshot;
  }

  public async refreshFeatureRequests(): Promise<void> {
    await this.ready;
    let response: SupportHttpResponse;
    try {
      response = await this.http.request("/v1/feature-requests", "GET");
      if (response.status !== 200) {
        return;
      }
      const featureRequests = readFeatureRequests(response.body);
      const pending = this.snapshot.featureRequests.filter(
        (featureRequest) => {
          const submission = this.snapshot.submissions.find(
            (candidate) => candidate.id === featureRequest.submissionId,
          );
          return submission !== undefined && submission.status !== "submitted";
        },
      );
      await this.publish(
        Object.freeze({
          ...this.snapshot,
          featureRequests: Object.freeze([...pending, ...featureRequests]),
        }),
      );
    } catch {
      // Keep the persisted list; feature discovery never blocks local support.
    }
  }

  public async submitSupport(request: Readonly<{
    message: string;
  }>): Promise<SubmitSupportResult> {
    await this.ready;
    const submission = makeSupportSubmission(
      this.localId("support"),
      request.message,
      this.clock.nowMs(),
    );
    await this.publish(saveSubmission(this.snapshot, submission));
    return this.attemptSubmission(submission);
  }

  public async submitFeatureRequest(
    request: Readonly<{ title: string; message: string }>,
  ): Promise<SubmitSupportResult> {
    await this.ready;
    const { submission, featureRequest } = makeFeatureSubmission(
      this.localId("feature"),
      request.title,
      request.message,
      this.clock.nowMs(),
    );
    await this.publish(
      saveSubmission(
        appendFeatureRequest(this.snapshot, featureRequest),
        submission,
      ),
    );
    return this.attemptSubmission(submission);
  }

  public async retrySubmission(
    submissionId: string,
  ): Promise<SubmitSupportResult> {
    await this.ready;
    const submission = this.snapshot.submissions.find(
      (candidate) => candidate.id === submissionId,
    );
    if (submission === undefined) {
      throw new Error(`Unknown support submission: ${submissionId}`);
    }
    if (submission.status === "submitted") {
      return Object.freeze({ status: "submitted", submissionId });
    }
    if (
      submission.status === "failed" &&
      submission.error.code === "request_rejected"
    ) {
      return Object.freeze({
        status: "failed",
        submissionId,
        error: submission.error,
      });
    }

    const retrying: SupportSubmission = Object.freeze({
      ...submission,
      status: "submitting",
      error: null,
    });
    await this.replaceSubmission(submission.id, retrying);
    return this.attemptSubmission(retrying);
  }

  public async voteOnFeatureRequest(
    featureRequestId: string,
  ): Promise<VoteOnFeatureRequestResult> {
    await this.ready;
    const response = await this.http.request(
      `/v1/feature-requests/${encodeURIComponent(featureRequestId)}/votes`,
      "POST",
    );
    const result = readFeatureVote(response.status, response.body);
    await this.publish(
      Object.freeze({
        ...this.snapshot,
        featureRequests: Object.freeze(
          this.snapshot.featureRequests.map((featureRequest) =>
            featureRequest.id === result.featureRequestId
              ? Object.freeze({
                  ...featureRequest,
                  voteCount: result.voteCount,
                  hasVoted: true,
                })
              : featureRequest,
          ),
        ),
      }),
    );
    return result;
  }

  public subscribe(listener: SupportStateListener): SupportUnsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private localId(kind: SupportSubmission["kind"]): string {
    return `local-${kind}-${this.clock.nowMs()}-${this.nextLocalId++}`;
  }

  private async attemptSubmission(
    submission: SupportSubmission,
  ): Promise<SubmitSupportResult> {
    let response: SupportHttpResponse;
    try {
      response = await this.postSupport({
        category: submission.kind,
        ...(submission.kind === "feature"
          ? { title: submission.title }
          : {}),
        message: submission.message,
      });
    } catch (error) {
      return this.failSubmission(
        submission,
        isSupportRequestTimeout(error) ? TIMEOUT_ERROR : OFFLINE_ERROR,
      );
    }
    if (response.status >= 500) {
      return this.failSubmission(submission, SERVICE_UNAVAILABLE_ERROR);
    }
    if (response.status >= 400) {
      return this.failSubmission(submission, REQUEST_REJECTED_ERROR);
    }
    let receipt: SupportSubmissionReceipt;
    try {
      receipt = readSubmissionReceipt(
        response.status,
        response.body,
        submission.kind,
      );
    } catch {
      return this.failSubmission(submission, SERVICE_UNAVAILABLE_ERROR);
    }
    const submitted: SupportSubmission = Object.freeze({
      ...submission,
      id: receipt.submissionId,
      status: "submitted",
      error: null,
    });
    await this.publish(
      Object.freeze({
        ...this.snapshot,
        submissions: Object.freeze(
          this.snapshot.submissions.map((candidate) =>
            candidate.id === submission.id ? submitted : candidate,
          ),
        ),
        featureRequests: Object.freeze(
          this.snapshot.featureRequests.map((featureRequest) =>
            featureRequest.submissionId === submission.id &&
            receipt.featureRequestId !== null
              ? Object.freeze({
                  ...featureRequest,
                  id: receipt.featureRequestId,
                  submissionId: receipt.submissionId,
                })
              : featureRequest,
          ),
        ),
      }),
    );
    return Object.freeze({
      status: "submitted",
      submissionId: receipt.submissionId,
    });
  }

  private async postSupport(body: Readonly<Record<string, string>>) {
    return this.http.request("/v1/support", "POST", body);
  }

  private async replaceSubmission(
    currentId: string,
    replacement: SupportSubmission,
  ): Promise<void> {
    await this.publish(
      Object.freeze({
        ...this.snapshot,
        submissions: Object.freeze(
          this.snapshot.submissions.map((submission) =>
            submission.id === currentId ? replacement : submission,
          ),
        ),
      }),
    );
  }

  private async failSubmission(
    submission: SupportSubmission,
    error: SupportError,
  ): Promise<SubmitSupportResult> {
    const failed: SupportSubmission = Object.freeze({
      ...submission,
      status: "failed",
      error,
    });
    await this.replaceSubmission(submission.id, failed);
    return Object.freeze({
      status: "failed",
      submissionId: submission.id,
      error,
    });
  }

  private async publish(snapshot: SupportSnapshot): Promise<void> {
    this.snapshot = Object.freeze(snapshot);
    await this.persistence.save(this.snapshot);
    this.listeners.forEach((listener) => listener(this.snapshot));
  }
}
