import AsyncStorage from "@react-native-async-storage/async-storage";
import type { StateStorage } from "zustand/middleware";

import type {
  FeatureRequest,
  SupportError,
  SupportSnapshot,
  SupportSubmission,
} from "./SupportModule";

export const MOCK_SUPPORT_STORAGE_KEY = "excerlock.support.mock.v1";

const INTERRUPTED_ERROR: SupportError = Object.freeze({
  code: "service_unavailable",
  message:
    "The previous send was interrupted. This wasn't sent. It is saved here so you can try again.",
});

const EMPTY_SNAPSHOT: SupportSnapshot = Object.freeze({
  submissions: Object.freeze([]),
  featureRequests: Object.freeze([]),
});

export function createMockSupportPersistence(
  storage: StateStorage<Promise<void>> = AsyncStorage,
) {
  let pending = Promise.resolve();

  return {
    load: async (): Promise<SupportSnapshot> => {
      await pending;
      try {
        const stored = await storage.getItem(MOCK_SUPPORT_STORAGE_KEY);
        if (stored === null) {
          return EMPTY_SNAPSHOT;
        }
        return readSnapshot(JSON.parse(stored));
      } catch {
        return EMPTY_SNAPSHOT;
      }
    },
    save: (snapshot: SupportSnapshot): Promise<void> => {
      pending = pending.then(() =>
        storage.setItem(
          MOCK_SUPPORT_STORAGE_KEY,
          JSON.stringify({ version: 1, snapshot }),
        ),
      );
      return pending;
    },
  };
}

function readSnapshot(value: unknown): SupportSnapshot {
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    !isRecord(value.snapshot)
  ) {
    return EMPTY_SNAPSHOT;
  }

  const submissions = Array.isArray(value.snapshot.submissions)
    ? value.snapshot.submissions.flatMap(readSubmission)
    : [];
  const featureRequests = Array.isArray(value.snapshot.featureRequests)
    ? value.snapshot.featureRequests.flatMap(readFeatureRequest)
    : [];

  return Object.freeze({
    submissions: Object.freeze(submissions),
    featureRequests: Object.freeze(featureRequests),
  });
}

function readSubmission(value: unknown): readonly SupportSubmission[] {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.message) ||
    !Number.isFinite(value.createdAtMs)
  ) {
    return [];
  }

  const content =
    value.kind === "support" && value.title === null
      ? ({ kind: "support" as const, title: null } as const)
      : value.kind === "feature" && isNonEmptyString(value.title)
        ? ({ kind: "feature" as const, title: value.title.trim() } as const)
        : null;
  if (content === null) {
    return [];
  }

  const base = {
    id: value.id.trim(),
    message: value.message.trim(),
    createdAtMs: value.createdAtMs as number,
    ...content,
  };
  if (value.status === "submitted") {
    return [Object.freeze({ ...base, status: "submitted", error: null })];
  }
  if (value.status === "submitting") {
    return [
      Object.freeze({
        ...base,
        status: "failed",
        error: INTERRUPTED_ERROR,
      }),
    ];
  }
  const error = readError(value.error);
  return value.status === "failed" && error !== null
    ? [Object.freeze({ ...base, status: "failed", error })]
    : [];
}

function readFeatureRequest(value: unknown): readonly FeatureRequest[] {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.title) ||
    !isNonEmptyString(value.message) ||
    !Number.isInteger(value.voteCount) ||
    (value.voteCount as number) < 0 ||
    typeof value.hasVoted !== "boolean" ||
    (value.submissionId !== null && !isNonEmptyString(value.submissionId))
  ) {
    return [];
  }

  return [
    Object.freeze({
      id: value.id.trim(),
      title: value.title.trim(),
      message: value.message.trim(),
      voteCount: value.voteCount as number,
      hasVoted: value.hasVoted,
      submissionId:
        value.submissionId === null ? null : value.submissionId.trim(),
    }),
  ];
}

function readError(value: unknown): SupportError | null {
  if (
    !isRecord(value) ||
    (value.code !== "offline" && value.code !== "service_unavailable") ||
    !isNonEmptyString(value.message)
  ) {
    return null;
  }
  return Object.freeze({ code: value.code, message: value.message.trim() });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
