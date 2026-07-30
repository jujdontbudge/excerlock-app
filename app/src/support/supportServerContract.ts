import type {
  FeatureRequest,
  SupportSubmission,
} from "./SupportModule";

export type SupportSubmissionReceipt = Readonly<{
  submissionId: string;
  featureRequestId: string | null;
}>;

export type FeatureVoteReceipt = Readonly<{
  status: "voted" | "alreadyVoted";
  featureRequestId: string;
  voteCount: number;
}>;

export function readSubmissionReceipt(
  status: number,
  value: unknown,
  kind: SupportSubmission["kind"],
): SupportSubmissionReceipt {
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
    submissionId: value.submissionId.trim(),
    featureRequestId:
      kind === "feature" && "featureRequestId" in value
        ? (value.featureRequestId as string).trim()
        : null,
  });
}

export function readFeatureRequests(
  value: unknown,
): readonly FeatureRequest[] {
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

export function readFeatureVote(
  status: number,
  value: unknown,
): FeatureVoteReceipt {
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
    featureRequestId: value.featureRequestId.trim(),
    voteCount: value.voteCount as number,
  });
}
