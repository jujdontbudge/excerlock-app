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

type SupportHttpResponse = Readonly<{
  status: number;
  json(): Promise<unknown>;
}>;

type SupportFetch = (
  url: string,
  init: Readonly<{
    body?: string;
    headers: Readonly<Record<string, string>>;
    method: "GET" | "POST";
    signal: AbortSignal;
  }>,
) => Promise<SupportHttpResponse>;

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
  private readonly baseUrl: string;
  private readonly clock: SupportClock;
  private readonly fetch: SupportFetch;
  private readonly getAccessToken: () => Promise<string | null>;
  private readonly listeners = new Set<SupportStateListener>();
  private readonly persistence: ReturnType<typeof createMockSupportPersistence>;
  private readonly ready: Promise<void>;
  private readonly requestTimeoutMs: number;
  private nextLocalId = 1;
  private snapshot = EMPTY_SUPPORT_SNAPSHOT;

  public constructor(options: HttpSupportModuleOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.clock = options.clock ?? new SystemSupportClock();
    this.fetch = options.fetch ?? globalThis.fetch;
    this.getAccessToken = options.getAccessToken;
    this.persistence = createMockSupportPersistence(options.storage);
    this.requestTimeoutMs = options.requestTimeoutMs ?? REQUEST_TIMEOUT_MS;
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
      response = await this.request("/v1/feature-requests", "GET");
      if (response.status !== 200) {
        return;
      }
      const featureRequests = readFeatureRequests(await response.json());
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
    const response = await this.request(
      `/v1/feature-requests/${encodeURIComponent(featureRequestId)}/votes`,
      "POST",
    );
    const result = readFeatureVote(response.status, await response.json());
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
        isAbortError(error) ? TIMEOUT_ERROR : OFFLINE_ERROR,
      );
    }
    if (response.status >= 500) {
      return this.failSubmission(submission, SERVICE_UNAVAILABLE_ERROR);
    }
    if (response.status >= 400) {
      return this.failSubmission(submission, REQUEST_REJECTED_ERROR);
    }
    let receipt: ReturnType<typeof readSubmissionReceipt>;
    try {
      receipt = readSubmissionReceipt(
        response.status,
        await response.json(),
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
    return this.request("/v1/support", "POST", body);
  }

  private async request(
    path: string,
    method: "GET" | "POST",
    body?: Readonly<Record<string, string>>,
  ): Promise<SupportHttpResponse> {
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout>;
    const timedOut = new Promise<never>((_resolve, reject) => {
      timeout = setTimeout(() => {
        controller.abort();
        reject(createTimeoutError());
      }, this.requestTimeoutMs);
    });
    try {
      const token = await Promise.race([this.getAccessToken(), timedOut]);
      return await Promise.race([
        this.fetch(`${this.baseUrl}${path}`, {
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
          headers: {
            Accept: "application/json",
            ...(token === null ? {} : { Authorization: `Bearer ${token}` }),
            ...(body === undefined
              ? {}
              : { "Content-Type": "application/json" }),
          },
          method,
          signal: controller.signal,
        }),
        timedOut,
      ]);
    } finally {
      clearTimeout(timeout!);
    }
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

function readSubmissionReceipt(
  status: number,
  value: unknown,
  kind: SupportSubmission["kind"],
): Readonly<{ submissionId: string; featureRequestId: string | null }> {
  if (
    status !== 201 ||
    typeof value !== "object" ||
    value === null ||
    !("submissionId" in value) ||
    typeof value.submissionId !== "string" ||
    value.submissionId.trim().length === 0
  ) {
    throw new Error("Support server returned an invalid submission response");
  }
  if (
    kind === "feature" &&
    (!("featureRequestId" in value) ||
      typeof value.featureRequestId !== "string" ||
      value.featureRequestId.trim().length === 0)
  ) {
    throw new Error("Support server returned an invalid submission response");
  }
  return Object.freeze({
    submissionId: value.submissionId,
    featureRequestId:
      kind === "feature" && "featureRequestId" in value
        ? (value.featureRequestId as string)
        : null,
  });
}

function readFeatureRequests(value: unknown): readonly FeatureRequest[] {
  if (
    typeof value !== "object" ||
    value === null ||
    !("featureRequests" in value) ||
    !Array.isArray(value.featureRequests)
  ) {
    throw new Error("Support server returned an invalid feature request list");
  }
  return Object.freeze(
    value.featureRequests.map((featureRequest) => {
      if (
        typeof featureRequest !== "object" ||
        featureRequest === null ||
        !("id" in featureRequest) ||
        typeof featureRequest.id !== "string" ||
        featureRequest.id.trim().length === 0 ||
        !("submissionId" in featureRequest) ||
        typeof featureRequest.submissionId !== "string" ||
        featureRequest.submissionId.trim().length === 0 ||
        !("title" in featureRequest) ||
        typeof featureRequest.title !== "string" ||
        featureRequest.title.trim().length === 0 ||
        !("message" in featureRequest) ||
        typeof featureRequest.message !== "string" ||
        featureRequest.message.trim().length === 0 ||
        !("voteCount" in featureRequest) ||
        !Number.isInteger(featureRequest.voteCount) ||
        (featureRequest.voteCount as number) < 0 ||
        !("hasVoted" in featureRequest) ||
        typeof featureRequest.hasVoted !== "boolean"
      ) {
        throw new Error(
          "Support server returned an invalid feature request list",
        );
      }
      return Object.freeze({
        id: featureRequest.id.trim(),
        submissionId: featureRequest.submissionId.trim(),
        title: featureRequest.title.trim(),
        message: featureRequest.message.trim(),
        voteCount: featureRequest.voteCount as number,
        hasVoted: featureRequest.hasVoted,
      });
    }),
  );
}

function readFeatureVote(
  status: number,
  value: unknown,
): VoteOnFeatureRequestResult {
  if (
    typeof value !== "object" ||
    value === null ||
    !("status" in value) ||
    (value.status !== "voted" && value.status !== "alreadyVoted") ||
    (value.status === "voted" ? status !== 201 : status !== 200) ||
    !("featureRequestId" in value) ||
    typeof value.featureRequestId !== "string" ||
    value.featureRequestId.trim().length === 0 ||
    !("voteCount" in value) ||
    !Number.isInteger(value.voteCount) ||
    (value.voteCount as number) < 0
  ) {
    throw new Error("Support server returned an invalid feature vote response");
  }
  return Object.freeze({
    status: value.status,
    featureRequestId: value.featureRequestId,
    voteCount: value.voteCount as number,
  });
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function createTimeoutError(): Error {
  return Object.assign(new Error("Support request timed out"), {
    name: "AbortError",
  });
}
