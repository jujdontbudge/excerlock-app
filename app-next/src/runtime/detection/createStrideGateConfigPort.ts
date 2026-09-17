import {
  SHIPPED_STRIDE_GATE_REPORT,
  effectiveWalkingGraceMs,
  resolveStrideGateConfig,
  type StrideGateReport,
} from './strideGateConfig';

export interface StrideGateConfigDeps {
  /** Reads the PostHog `stride_gate_config` payload once flags have settled for the committed identity. */
  readPayload(): Promise<unknown>;
  /** The consumer: `MotionAdapter.applyStrideGateConfig`. */
  apply(report: StrideGateReport): void;
  /** Observability hook for the effective configuration; the port also keeps it for `report()`. */
  onReport?(report: StrideGateReport): void;
  reportError?(error: unknown): void;
}

export interface StrideGateConfigPort {
  /**
   * Resolves the flag rail into a report and applies it. Never rejects: a read
   * failure applies the shipped gate and is reported. Concurrent calls share
   * one read, so launch and foreground can both ask without double-fetching.
   */
  sync(): Promise<StrideGateReport>;
  /** The configuration the app is running with right now (shipped defaults before the first sync). */
  report(): StrideGateReport;
  /** The grace the reducer will see for a given user preference. */
  walkingGraceMs(userGraceMs: number): number;
}

/**
 * Owns the one remote gate configuration the app runs.
 *
 * The payload is resolved and clamped by `resolveStrideGateConfig` before the
 * adapter sees it, so the adapter can only ever be handed the shipped gate or
 * an in-clamp one. A missing payload, a malformed one and a read failure all
 * apply the shipped gate: the app never keeps running a stale remote
 * configuration just because a later read went wrong. The kill switch travels
 * inside the payload and drops the raw-stream leg in the adapter.
 */
export function createStrideGateConfigPort(deps: StrideGateConfigDeps): StrideGateConfigPort {
  let applied: StrideGateReport = SHIPPED_STRIDE_GATE_REPORT;
  let inFlight: Promise<StrideGateReport> | null = null;
  const settle = (report: StrideGateReport): StrideGateReport => {
    applied = report;
    deps.apply(report);
    deps.onReport?.(report);
    return report;
  };
  const run = async (): Promise<StrideGateReport> => {
    try {
      const payload = await deps.readPayload();
      return settle(resolveStrideGateConfig({ payload }));
    } catch (error) {
      deps.reportError?.(error);
      // A failed read is not evidence that the remote configuration changed;
      // the shipped gate is the only configuration this port can vouch for.
      return settle(SHIPPED_STRIDE_GATE_REPORT);
    }
  };
  return {
    sync() {
      if (inFlight) return inFlight;
      inFlight = run().finally(() => {
        inFlight = null;
      });
      return inFlight;
    },
    report() {
      return applied;
    },
    walkingGraceMs(userGraceMs) {
      return effectiveWalkingGraceMs(applied.effective, userGraceMs);
    },
  };
}
