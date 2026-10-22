import type { CheckoutAttemptProps, CheckoutCompletionProps, CheckoutFailureKind, CheckoutOutcome, CheckoutStage, CheckoutStageProps, ClientEventName } from '@excerlock/analytics-events';
import type { AnalyticsPort } from '../ports/AnalyticsPort';
import { adaptyErrorCode, purchaseFailureClass } from './purchaseErrors';

export type ObserveStoreKitInactive = (inactive: () => void) => () => void;

const elapsed = (start: number) => Math.min(86_400_000, Math.max(0, Math.round(performance.now() - start)));
const failureCode = (failure: unknown) => {
  const code = adaptyErrorCode(failure);
  return code !== null && Number.isInteger(code) && code >= 0 && code <= 9999 ? code : undefined;
};
const failureKind = (stage: CheckoutStage, failure: unknown): CheckoutFailureKind => {
  if (stage === 'identity_ready') return 'auth';
  if (stage === 'recovery_journal') return 'storage';
  if (stage === 'entitlement_verification') return 'verification';
  if (adaptyErrorCode(failure) === 2002) return 'auth';
  if (purchaseFailureClass(failure) === 'network') return 'transport';
  return failureCode(failure) === undefined ? 'unknown' : 'vendor';
};

export class CheckoutDiagnostics {
  private readonly started = performance.now();
  private readonly context: CheckoutAttemptProps;
  private currentStage: CheckoutStage = 'identity_ready';
  private outcome: CheckoutOutcome = 'failed';
  private failingStage: CheckoutStage | 'none' = 'none';
  private failureKind: CheckoutFailureKind = 'none';
  private failureCode: number | undefined;
  private storeKitMs: number | undefined;
  private sheetObservation: CheckoutCompletionProps['sheet_observation'] = 'not_called';
  private entitlementResult: CheckoutCompletionProps['entitlement_result'] = 'not_checked';
  private completed = false;

  constructor(private analytics: Pick<AnalyticsPort, 'track'>, context: Omit<CheckoutAttemptProps, 'attempt_id'>) {
    this.context = { ...context, attempt_id: Math.floor(Math.random() * 2 ** 48).toString(16).padStart(12, '0') };
    this.emit('checkout_attempt_started', this.context);
    this.stage('identity_ready');
  }

  private emit(event: ClientEventName, props: CheckoutAttemptProps | CheckoutStageProps | CheckoutCompletionProps) {
    void Promise.resolve().then(() => this.analytics.track(event, props)).catch(() => undefined);
  }

  stage(stage: CheckoutStage) {
    this.currentStage = stage;
    this.record('started');
  }

  record(stageResult: CheckoutStageProps['stage_result'], failure?: unknown, kind?: CheckoutFailureKind) {
    this.emit('checkout_stage_recorded', {
      ...this.context, stage: this.currentStage, stage_result: stageResult, elapsed_ms: elapsed(this.started),
      ...(failure === undefined && kind === undefined ? {} : { failure_code: failureCode(failure), failure_kind: kind ?? failureKind(this.currentStage, failure) }),
    });
  }

  result(outcome: CheckoutOutcome, failure?: unknown) {
    this.outcome = outcome;
    this.failureCode = failureCode(failure);
  }

  entitlement(result: CheckoutCompletionProps['entitlement_result']) {
    this.entitlementResult = result;
  }

  fail(failure: unknown) {
    if (this.failingStage !== 'none') return;
    this.failingStage = this.currentStage;
    this.failureKind = failureKind(this.currentStage, failure);
    this.failureCode = failureCode(failure) ?? this.failureCode;
    if (this.currentStage === 'entitlement_verification') this.entitlementResult = 'failed';
    this.record('failed', failure);
  }

  async storeKit<T>(operation: () => Promise<T>, observeInactive?: ObserveStoreKitInactive): Promise<T> {
    this.stage('storekit');
    let inFlight = true;
    let stop: (() => void) | undefined;
    this.sheetObservation = observeInactive ? 'not_observed' : 'unavailable';
    try {
      stop = observeInactive?.(() => { if (inFlight) this.sheetObservation = 'inactive'; });
    } catch { this.sheetObservation = 'unavailable'; }
    const started = performance.now();
    try {
      return await operation();
    } finally {
      this.storeKitMs = elapsed(started);
      inFlight = false;
      try { stop?.(); } catch { }
    }
  }

  complete() {
    if (this.completed) return;
    this.completed = true;
    this.emit('checkout_attempt_completed', {
      ...this.context, outcome: this.outcome, stage: this.currentStage, failing_stage: this.failingStage,
      failure_kind: this.failureKind, failure_code: this.failureCode, duration_ms: elapsed(this.started),
      storekit_ms: this.storeKitMs, sheet_observation: this.sheetObservation, entitlement_result: this.entitlementResult,
    });
  }
}
