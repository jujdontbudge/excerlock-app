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
    downstream: createIdentityErasureGateway({
      adaptySecretKey: environment.adaptySecretKey as string,
      posthogPersonalApiKey: environment.posthogPersonalApiKey as string,
      posthogProjectId: environment.posthogProjectId as string,
      posthogApiHost: environment.posthogApiHost,
      supabaseUrl: environment.supabaseUrl as string,
      supabaseServiceRoleKey: environment.supabaseServiceRoleKey as string,
      ...(environment.clerkSecretKey
        ? { clerkSecretKey: environment.clerkSecretKey }
        : {}),
      timeoutMs: environment.deletionGatewayTimeoutMs,
    }),
  });
}
