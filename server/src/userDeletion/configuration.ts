import { config } from "../config.js";
import type { Environment } from "../env.js";
import { createDrizzleUserDeletionRepository } from "./drizzleRepository.js";
import { createIdentityErasureGateway } from "./httpGateway.js";
import {
  createUserDeletionService,
  type UserDeletionService,
} from "./service.js";

export class UserDeletionConfigurationError extends Error {
  constructor() {
    super("Account deletion is not configured");
    this.name = "UserDeletionConfigurationError";
  }
}

export function createConfiguredUserDeletionService(
  environment: Environment = config,
): UserDeletionService {
  if (
    !environment.databaseUrl ||
    !environment.supabaseUrl ||
    !environment.supabaseServiceRoleKey ||
    !environment.adaptySecretKey ||
    !environment.posthogPersonalApiKey ||
    !environment.posthogProjectId
  ) {
    throw new UserDeletionConfigurationError();
  }

  return createUserDeletionService({
    repository: createDrizzleUserDeletionRepository(),
    downstream: createIdentityErasureGateway({
      supabaseUrl: environment.supabaseUrl,
      supabaseServiceRoleKey: environment.supabaseServiceRoleKey,
      adaptySecretKey: environment.adaptySecretKey,
      posthogPersonalApiKey: environment.posthogPersonalApiKey,
      posthogProjectId: environment.posthogProjectId,
      posthogApiHost: environment.posthogApiHost,
    }),
  });
}
