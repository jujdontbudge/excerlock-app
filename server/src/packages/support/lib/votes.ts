import { randomUUID } from "node:crypto";
import {
  FeatureRequestNotFoundError,
  SupportUserNotFoundError,
} from "./errors.js";
import type { FeatureRequestVoteRepository } from "./repository.js";

export interface FeatureRequestVoteResult {
  status: "voted" | "alreadyVoted";
  featureRequestId: string;
  voteCount: number;
}

export interface FeatureRequestVoteService {
  vote(
    userId: string,
    featureRequestId: string,
  ): Promise<FeatureRequestVoteResult>;
}

export function createFeatureRequestVoteService(options: {
  repository: FeatureRequestVoteRepository;
  now?: () => Date;
  randomId?: () => string;
}): FeatureRequestVoteService {
  const now = options.now ?? (() => new Date());
  const randomId = options.randomId ?? randomUUID;

  return {
    async vote(userId, featureRequestId) {
      if (!(await options.repository.userExists(userId))) {
        throw new SupportUserNotFoundError(userId);
      }

      const persisted = await options.repository.recordFeatureRequestVote({
        id: randomId(),
        featureRequestId,
        userId,
        createdAt: now(),
      });
      if (!persisted) {
        throw new FeatureRequestNotFoundError(featureRequestId);
      }

      return {
        status: persisted.status,
        featureRequestId,
        voteCount: persisted.voteCount,
      };
    },
  };
}
