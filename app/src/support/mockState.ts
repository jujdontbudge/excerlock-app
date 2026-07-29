import type {
  FeatureRequest,
  SupportSnapshot,
  SupportSubmission,
  VoteOnFeatureRequestResult,
} from "./SupportModule";

export const EMPTY_SUPPORT_SNAPSHOT: SupportSnapshot = Object.freeze({
  submissions: Object.freeze([]),
  featureRequests: Object.freeze([]),
});

export function makeSupportSubmission(
  id: string,
  message: string,
  createdAtMs: number,
): SupportSubmission {
  return Object.freeze({
    id,
    kind: "support",
    title: null,
    message: message.trim(),
    createdAtMs,
    status: "submitting",
    error: null,
  });
}

export function makeFeatureSubmission(
  id: string,
  title: string,
  message: string,
  createdAtMs: number,
): Readonly<{
  submission: SupportSubmission;
  featureRequest: FeatureRequest;
}> {
  const submission: SupportSubmission = Object.freeze({
    id,
    kind: "feature",
    title: title.trim(),
    message: message.trim(),
    createdAtMs,
    status: "submitting",
    error: null,
  });
  return Object.freeze({
    submission,
    featureRequest: Object.freeze({
      id,
      title: submission.title,
      message: submission.message,
      voteCount: 0,
      hasVoted: false,
      submissionId: id,
    }),
  });
}

export function appendFeatureRequest(
  snapshot: SupportSnapshot,
  featureRequest: FeatureRequest,
): SupportSnapshot {
  return Object.freeze({
    ...snapshot,
    featureRequests: Object.freeze([
      ...snapshot.featureRequests,
      featureRequest,
    ]),
  });
}

export function applyFeatureVote(
  snapshot: SupportSnapshot,
  featureRequestId: string,
): Readonly<{
  snapshot: SupportSnapshot;
  result: VoteOnFeatureRequestResult;
}> {
  const featureRequest = snapshot.featureRequests.find(
    (candidate) => candidate.id === featureRequestId,
  );
  if (featureRequest === undefined) {
    throw new Error(`Unknown feature request: ${featureRequestId}`);
  }
  if (featureRequest.hasVoted) {
    return Object.freeze({
      snapshot,
      result: Object.freeze({
        status: "alreadyVoted",
        featureRequestId,
        voteCount: featureRequest.voteCount,
      }),
    });
  }

  const votedFeatureRequest: FeatureRequest = Object.freeze({
    ...featureRequest,
    voteCount: featureRequest.voteCount + 1,
    hasVoted: true,
  });
  return Object.freeze({
    snapshot: Object.freeze({
      ...snapshot,
      featureRequests: Object.freeze(
        snapshot.featureRequests.map((current) =>
          current.id === featureRequestId ? votedFeatureRequest : current,
        ),
      ),
    }),
    result: Object.freeze({
      status: "voted",
      featureRequestId,
      voteCount: votedFeatureRequest.voteCount,
    }),
  });
}

export function saveSubmission(
  snapshot: SupportSnapshot,
  submission: SupportSubmission,
): SupportSnapshot {
  const exists = snapshot.submissions.some(
    (current) => current.id === submission.id,
  );
  return exists
    ? replaceSubmission(snapshot, submission)
    : Object.freeze({
        ...snapshot,
        submissions: Object.freeze([...snapshot.submissions, submission]),
      });
}

export function replaceSubmission(
  snapshot: SupportSnapshot,
  submission: SupportSubmission,
): SupportSnapshot {
  return Object.freeze({
    ...snapshot,
    submissions: Object.freeze(
      snapshot.submissions.map((current) =>
        current.id === submission.id ? Object.freeze(submission) : current,
      ),
    ),
  });
}

export function nextNumericId(
  submissions: readonly SupportSubmission[],
  kind: SupportSubmission["kind"],
): number {
  return (
    submissions.reduce((largest, submission) => {
      if (submission.kind !== kind) {
        return largest;
      }
      const numericId = Number.parseInt(
        submission.id.slice(`${kind}-`.length),
        10,
      );
      return Number.isFinite(numericId) ? Math.max(largest, numericId) : largest;
    }, 0) + 1
  );
}
