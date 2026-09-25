import { config } from "../config/config.js";
import type { Environment } from "../config/env.js";
import { createDrizzleUserDeletionRepository } from "./lib/drizzleRepository.js";
import { createIdentityErasureGateway, erasureConfigurationFrom } from "./lib/httpGateway.js";
import {
  createUserDeletionService,
  type UserDeletionService,
} from "./lib/service.js";

export class UserDeletionConfigurationError extends Error {
  constructor() {
    super("Account deletion is not configured");
    this.name = "UserDeletionConfigurationError";
  }
}

export function isUserDeletionConfigured(
  environment: Environment = config,
): boolean {
  return Boolean(
    environment.databaseUrl &&
      environment.supabaseUrl &&
      environment.supabaseServiceRoleKey &&
      environment.adaptySecretKey &&
      environment.posthogPersonalApiKey &&
      environment.posthogProjectId,
  );
}

export function createConfiguredUserDeletionService(
  environment: Environment = config,
): UserDeletionService {
  if (!isUserDeletionConfigured(environment)) {
    throw new UserDeletionConfigurationError();
  }

  return createUserDeletionService({
    authProvider: "supabase",
    repository: createDrizzleUserDeletionRepository(),
    downstream: createIdentityErasureGateway(erasureConfigurationFrom(environment)),
  });
}
