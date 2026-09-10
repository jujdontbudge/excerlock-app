export { createDrizzleUserDeletionRepository } from "./drizzleRepository.js";
export {
  createConfiguredUserDeletionService,
  isUserDeletionConfigured,
  UserDeletionConfigurationError,
} from "./configuration.js";
export {
  createIdentityErasureGateway,
  IdentityErasureRequestError,
  supabaseAdminUserUrl,
  type IdentityErasureConfiguration,
} from "./httpGateway.js";
export {
  createUserDeletionService,
  type IdentityErasureGateway,
  type UserDeletionService,
  type UserDeletionServiceOptions,
} from "./service.js";
export {
  createDeletionRetryWorker,
  type DeletionRetryWorker,
  type DeletionRetryWorkerOptions,
} from "./retryWorker.js";
export type {
  AuthErasureProvider,
  UserDeletionRepository,
  UserDeletionState,
} from "./repository.js";
