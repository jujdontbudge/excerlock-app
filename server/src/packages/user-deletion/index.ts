export { createDrizzleUserDeletionRepository } from "./lib/drizzleRepository.js";
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
} from "./lib/httpGateway.js";
export {
  createUserDeletionService,
  type IdentityErasureGateway,
  type UserDeletionService,
  type UserDeletionServiceOptions,
} from "./lib/service.js";
export {
  createDeletionRetryWorker,
  type DeletionRetryWorker,
  type DeletionRetryWorkerOptions,
} from "./lib/retryWorker.js";
export type {
  AuthErasureProvider,
  UserDeletionRepository,
  UserDeletionState,
} from "./lib/repository.js";
