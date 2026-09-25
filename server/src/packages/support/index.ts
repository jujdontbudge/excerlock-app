export { renderSupportEmail, sendSupportEmail } from "./lib/notify.js";
export {
  createSupportSubmissionService,
  type SupportSubmissionAnalytics,
  type SupportSubmissionInput,
  type SupportSubmissionResult,
  type SupportSubmissionService,
  type SupportSubmissionServiceOptions,
} from "./lib/submission.js";
export {
  createFeatureRequestService,
  type FeatureRequestService,
} from "./lib/featureRequests.js";
export {
  createDrizzleFeatureRequestRepository,
  createDrizzleFeatureRequestVoteRepository,
  createDrizzleSupportSubmissionRepository,
} from "./lib/drizzleRepository.js";
export {
  createFeatureRequestVoteService,
  type FeatureRequestVoteResult,
  type FeatureRequestVoteService,
} from "./lib/votes.js";
export {
  type FeatureRequestRecord,
  type FeatureRequestRepository,
  type FeatureRequestVoteRepository,
  type NewFeatureRequestRecord,
  type NewFeatureRequestVoteRecord,
  type NewSupportSubmissionRecord,
  type PersistedFeatureRequestVote,
  type SupportSubmissionRepository,
} from "./lib/repository.js";
export {
  FeatureRequestNotFoundError,
  SupportUserNotFoundError,
} from "./lib/errors.js";
