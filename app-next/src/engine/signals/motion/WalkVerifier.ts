import {
  WALK_CADENCE_FRESHNESS_MS,
  WALK_CADENCE_THRESHOLD_STEPS_PER_MINUTE,
  WALK_REQUIRED_QUALIFYING_CADENCE_SAMPLES,
} from "./constants";
import type { ActivitySample, CadenceSample } from "./MotionProvider";

export type WalkVerdict =
  | {
      readonly isWalking: false;
      readonly phase: "notWalking";
      readonly evaluatedAt: number;
    }
  | {
      readonly isWalking: true;
      readonly phase: "verified";
      readonly evaluatedAt: number;
    }
  | {
      readonly isWalking: true;
      readonly phase: "grace";
      readonly evaluatedAt: number;
      readonly graceEndsAt: number;
    };

export interface WalkVerifierOptions {
  readonly gracePeriodMs: number;
}

function validateOptions(options: WalkVerifierOptions): void {
  if (
    !Number.isFinite(options.gracePeriodMs) ||
    options.gracePeriodMs < 30_000 ||
    options.gracePeriodMs > 5 * 60_000
  ) {
    throw new Error("Walk grace period must be between 30 seconds and 5 minutes");
  }
}

export class WalkVerifier {
  private activity: ActivitySample | undefined;
  private cadence: CadenceSample | undefined;
  private graceEndsAt: number | undefined;
  private lastQualifyingCadenceAt: number | undefined;
  private qualifyingCadenceSamples = 0;
  private verified = false;

  public constructor(private readonly options: WalkVerifierOptions) {
    validateOptions(options);
  }

  public processActivity(sample: ActivitySample): WalkVerdict {
    this.activity = sample;
    this.resetQualifyingCadence();
    if (sample.classes.includes("automotive")) {
      return this.disqualifyImmediately(sample.receivedAt);
    }
    return this.evaluate(sample.receivedAt);
  }

  public processCadence(sample: CadenceSample): WalkVerdict {
    this.cadence = sample;
    this.recordCadenceQualification(sample);
    return this.evaluate(sample.asOf);
  }

  public processAuthorizationDenied(atMs: number): WalkVerdict {
    return this.disqualifyImmediately(atMs);
  }

  public getVerdict(atMs: number): WalkVerdict {
    return this.evaluate(atMs);
  }

  private evaluate(atMs: number): WalkVerdict {
    if (
      this.hasQualifyingEvidence(atMs) &&
      (this.verified ||
        this.qualifyingCadenceSamples >=
          WALK_REQUIRED_QUALIFYING_CADENCE_SAMPLES)
    ) {
      this.verified = true;
      this.graceEndsAt = undefined;
      return this.currentVerdict(atMs);
    }

    if (this.verified && this.graceEndsAt === undefined) {
      this.graceEndsAt =
        this.disqualificationStartedAt(atMs) + this.options.gracePeriodMs;
    }
    if (
      this.verified &&
      this.graceEndsAt !== undefined &&
      atMs >= this.graceEndsAt
    ) {
      this.verified = false;
      this.graceEndsAt = undefined;
      this.resetQualifyingCadence();
    }
    return this.currentVerdict(atMs);
  }

  private hasQualifyingEvidence(atMs: number): boolean {
    const classes = this.activity?.classes ?? [];
    const stepsPerSecond = this.cadence?.stepsPerSecond;
    return (
      classes.includes("walking") &&
      !classes.includes("automotive") &&
      this.activity !== undefined &&
      this.cadence !== undefined &&
      this.cadence.asOf >= this.activity.startedAt &&
      this.cadence.asOf <= atMs &&
      atMs - this.cadence.asOf <= WALK_CADENCE_FRESHNESS_MS &&
      stepsPerSecond !== null &&
      stepsPerSecond !== undefined &&
      stepsPerSecond * 60 >= WALK_CADENCE_THRESHOLD_STEPS_PER_MINUTE
    );
  }

  private disqualificationStartedAt(atMs: number): number {
    const activity = this.activity;
    const cadence = this.cadence;
    if (activity === undefined || cadence === undefined) {
      return atMs;
    }
    if (
      !activity.classes.includes("walking") ||
      activity.classes.includes("automotive")
    ) {
      return activity.startedAt;
    }
    if (
      cadence.stepsPerSecond === null ||
      cadence.stepsPerSecond * 60 < WALK_CADENCE_THRESHOLD_STEPS_PER_MINUTE
    ) {
      return cadence.asOf;
    }
    if (cadence.asOf < activity.startedAt) {
      return activity.startedAt;
    }
    return cadence.asOf + WALK_CADENCE_FRESHNESS_MS;
  }

  private disqualifyImmediately(atMs: number): WalkVerdict {
    this.verified = false;
    this.graceEndsAt = undefined;
    this.resetQualifyingCadence();
    return this.currentVerdict(atMs);
  }

  private recordCadenceQualification(sample: CadenceSample): void {
    if (!this.hasQualifyingEvidence(sample.asOf)) {
      this.resetQualifyingCadence();
      return;
    }
    if (
      this.lastQualifyingCadenceAt !== undefined &&
      (sample.asOf <= this.lastQualifyingCadenceAt ||
        sample.asOf - this.lastQualifyingCadenceAt >
          WALK_CADENCE_FRESHNESS_MS)
    ) {
      this.qualifyingCadenceSamples = 1;
    } else {
      this.qualifyingCadenceSamples += 1;
    }
    this.lastQualifyingCadenceAt = sample.asOf;
  }

  private resetQualifyingCadence(): void {
    this.qualifyingCadenceSamples = 0;
    this.lastQualifyingCadenceAt = undefined;
  }

  private currentVerdict(atMs: number): WalkVerdict {
    if (!this.verified) {
      return {
        isWalking: false,
        phase: "notWalking",
        evaluatedAt: atMs,
      };
    }
    if (this.graceEndsAt !== undefined) {
      return {
        isWalking: true,
        phase: "grace",
        evaluatedAt: atMs,
        graceEndsAt: this.graceEndsAt,
      };
    }
    return {
      isWalking: true,
      phase: "verified",
      evaluatedAt: atMs,
    };
  }
}
