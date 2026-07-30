import type { StateStorage } from "zustand/middleware";

import { SystemSupportClock, type SupportClock } from "./clock";
import {
  EMPTY_SUPPORT_SNAPSHOT,
  makeSupportSubmission,
  saveSubmission,
} from "./mockState";
import { createMockSupportPersistence } from "./mockStore";
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

    let response: SupportHttpResponse;
    try {
      response = await this.postSupport({
        category: "support",
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
    const responseBody = await response.json();
    const submissionId = readSubmissionId(response.status, responseBody);
    const submitted: SupportSubmission = Object.freeze({
      ...submission,
      id: submissionId,
      status: "submitted",
      error: null,
    });
    await this.replaceSubmission(submission.id, submitted);
    return Object.freeze({ status: "submitted", submissionId });
  }

  public async submitFeatureRequest(
    _request: Readonly<{ title: string; message: string }>,
  ): Promise<SubmitSupportResult> {
    throw new Error("Feature submission is not implemented");
  }

  public async retrySubmission(
    _submissionId: string,
  ): Promise<SubmitSupportResult> {
    throw new Error("Support retry is not implemented");
  }

  public async voteOnFeatureRequest(
    _featureRequestId: string,
  ): Promise<VoteOnFeatureRequestResult> {
    throw new Error("Feature voting is not implemented");
  }

  public subscribe(listener: SupportStateListener): SupportUnsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private localId(kind: SupportSubmission["kind"]): string {
    return `local-${kind}-${this.clock.nowMs()}-${this.nextLocalId++}`;
  }

  private async postSupport(body: Readonly<Record<string, string>>) {
    const token = await this.getAccessToken();
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.requestTimeoutMs,
    );
    try {
      return await this.fetch(`${this.baseUrl}/v1/support`, {
        body: JSON.stringify(body),
        headers: {
          Accept: "application/json",
          ...(token === null ? {} : { Authorization: `Bearer ${token}` }),
          "Content-Type": "application/json",
        },
        method: "POST",
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
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

function readSubmissionId(status: number, value: unknown): string {
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
  return value.submissionId;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
