import { SupportUserNotFoundError } from "./errors.js";
import type {
  FeatureRequestRecord,
  FeatureRequestRepository,
} from "./repository.js";

export interface FeatureRequestService {
  list(
    userId: string,
  ): Promise<{ featureRequests: readonly FeatureRequestRecord[] }>;
}

export function createFeatureRequestService(options: {
  repository: FeatureRequestRepository;
}): FeatureRequestService {
  return {
    async list(userId) {
      if (!(await options.repository.userExists(userId))) {
        throw new SupportUserNotFoundError(userId);
      }

      return {
        featureRequests:
          await options.repository.listFeatureRequests(userId),
      };
    },
  };
}
