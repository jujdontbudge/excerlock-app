import { randomUUID } from "node:crypto";
import { config } from "../../config/config.js";
import type { Environment } from "../../config/env.js";
import { createDrizzleUserDeletionRepository } from "./drizzleRepository.js";
import type { UserDeletionRepository } from "./repository.js";
import {
  createUserDeletionService,
  type IdentityErasureGateway,
} from "./service.js";
import { createIdentityErasureGateway, erasureConfigurationFrom } from "./httpGateway.js";
import { isUserDeletionConfigured } from "../configuration.js";

export interface DeletionRetryWorkerOptions {
  repository?: UserDeletionRepository;
  downstream?: IdentityErasureGateway;
  environment?: Environment;
  intervalMs?: number;
  batchSize?: number;
  ownerId?: string;
  now?: () => Date;
  onError?: (info: { userId: string; error: unknown }) => void;
  onProcessed?: (info: { userId: string }) => void;
}

export interface DeletionRetryWorker {
  readonly ownerId: string;
  runOnce(): Promise<{ processed: string[]; failures: string[] }>;
  start(): void;
  stop(): void;
  readonly running: boolean;
}

function sanitizeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, 200) || "deletion retry failed";
}

function backoffMs(attempts: number): number {
  const base = 30_000 * 2 ** Math.min(attempts, 4);
  const capped = Math.min(base, 600_000);
  return capped + Math.floor(Math.random() * 5_000);
}

async function tryClaimLease(
  repository: UserDeletionRepository,
  userId: string,
  ownerId: string,
  now: Date,
  leaseTtlMs: number,
): Promise<boolean> {
  const expiresAt = new Date(now.getTime() + leaseTtlMs);
  return repository.claimDeletionLease(userId, ownerId, now, expiresAt);
}

export function createDeletionRetryWorker(
  options: DeletionRetryWorkerOptions = {},
): DeletionRetryWorker {
  const environment = options.environment ?? config;
  const intervalMs =
    options.intervalMs ?? environment.deletionWorkerIntervalMs;
  const batchSize = options.batchSize ?? environment.deletionWorkerBatchSize;
  const ownerId = options.ownerId ?? `worker-${randomUUID()}`;
  const now = options.now ?? (() => new Date());
  let timer: NodeJS.Timeout | null = null;
  let startupTimer: NodeJS.Timeout | null = null;
  let inFlight: Promise<unknown> | null = null;

  function resolveRepository(): UserDeletionRepository | null {
    if (options.repository) {
      return options.repository;
    }
    try {
      return createDrizzleUserDeletionRepository();
    } catch {
      return null;
    }
  }

  function resolveDownstream(): IdentityErasureGateway | null {
    if (options.downstream) {
      return options.downstream;
    }
    if (!isUserDeletionConfigured(environment)) {
      return null;
    }
    return createIdentityErasureGateway(erasureConfigurationFrom(environment));
  }

  async function runOnce(): Promise<{ processed: string[]; failures: string[] }> {
    const repository = resolveRepository();
    const downstream = resolveDownstream();
    if (!repository || !downstream) {
      return { processed: [], failures: [] };
    }
    const service = createUserDeletionService({
      repository,
      downstream,
      authProvider: "supabase",
      now,
    });
    const current = now();
    let candidates: Awaited<ReturnType<UserDeletionRepository["listIncompleteDeletions"]>> = [];
    try {
      candidates = await repository.listIncompleteDeletions(batchSize, current);
    } catch {
      return { processed: [], failures: [] };
    }
    const processed: string[] = [];
    const failures: string[] = [];
    for (const { userId, attempts } of candidates) {
      const claimed = await tryClaimLease(
        repository,
        userId,
        ownerId,
        now(),
        Math.max(intervalMs * 2, environment.deletionGatewayTimeoutMs * 3 + 30_000),
      );
      if (!claimed) {
        continue;
      }
      try {
        await service.deleteAccount(userId);
        processed.push(userId);
        options.onProcessed?.({ userId });
      } catch (error) {
        failures.push(userId);
        options.onError?.({ userId, error });
        try {
          const nextRetryAt = new Date(now().getTime() + backoffMs(attempts));
          await repository.recordDeletionFailure(
            userId,
            now(),
            nextRetryAt,
            sanitizeError(error),
            ownerId,
          );
        } catch {
        }
      }
    }
    return { processed, failures };
  }

  const worker: DeletionRetryWorker = {
    ownerId,
    get running() {
      return timer !== null;
    },
    async runOnce() {
      if (inFlight) {
        await inFlight;
        return { processed: [], failures: [] };
      }
      const run = (async () => runOnce())();
      inFlight = run;
      try {
        return await run;
      } finally {
        inFlight = null;
      }
    },
    start() {
      if (timer) {
        return;
      }
      const tick = () => {
        void worker.runOnce().catch(() => undefined);
      };
      timer = setInterval(tick, intervalMs);
      timer.unref?.();
      startupTimer = setTimeout(tick, Math.min(2_000, intervalMs));
      startupTimer.unref?.();
    },
    stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      if (startupTimer) {
        clearTimeout(startupTimer);
        startupTimer = null;
      }
    },
  };
  return worker;
}
