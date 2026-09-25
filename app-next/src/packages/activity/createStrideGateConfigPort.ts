import {
  SHIPPED_STRIDE_GATE_REPORT,
  effectiveWalkingGraceMs,
  resolveStrideGateConfig,
  type StrideGateReport,
} from './lib/detection/strideGateConfig';

export interface StrideGateConfigDeps {
  readPayload(): Promise<unknown>;
  apply(report: StrideGateReport): void;
  onReport?(report: StrideGateReport): void;
  reportError?(error: unknown): void;
}

export interface StrideGateConfigPort {
  sync(): Promise<StrideGateReport>;
  report(): StrideGateReport;
  walkingGraceMs(userGraceMs: number): number;
}

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
