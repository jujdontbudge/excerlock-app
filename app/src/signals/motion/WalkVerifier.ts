import { WALK_CADENCE_THRESHOLD_STEPS_PER_MINUTE } from "./constants";
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
  private verified = false;

  public constructor(private readonly options: WalkVerifierOptions) {
    validateOptions(options);
  }

  public processActivity(sample: ActivitySample): WalkVerdict {
    this.activity = sample;
    if (sample.classes.includes("automotive")) {
      return this.disqualifyImmediately(sample.receivedAt);
    }
    return this.evaluate(sample.receivedAt, sample.startedAt);
  }

  public processCadence(sample: CadenceSample): WalkVerdict {
    this.cadence = sample;
    return this.evaluate(sample.asOf, sample.asOf);
  }

  public processAuthorizationDenied(atMs: number): WalkVerdict {
    return this.disqualifyImmediately(atMs);
  }

  public getVerdict(atMs: number): WalkVerdict {
    if (
      this.verified &&
      this.graceEndsAt !== undefined &&
      atMs >= this.graceEndsAt
    ) {
      this.verified = false;
      this.graceEndsAt = undefined;
    }
    return this.currentVerdict(atMs);
  }

  private evaluate(atMs: number, disqualificationStartedAt: number): WalkVerdict {
    if (this.qualifies()) {
      this.verified = true;
      this.graceEndsAt = undefined;
      return this.currentVerdict(atMs);
    }

    if (this.verified && this.graceEndsAt === undefined) {
      this.graceEndsAt =
        disqualificationStartedAt + this.options.gracePeriodMs;
    }
    if (
      this.verified &&
      this.graceEndsAt !== undefined &&
      atMs >= this.graceEndsAt
    ) {
      this.verified = false;
      this.graceEndsAt = undefined;
    }
    return this.currentVerdict(atMs);
  }

  private qualifies(): boolean {
    const classes = this.activity?.classes ?? [];
    const stepsPerSecond = this.cadence?.stepsPerSecond;
    return (
      classes.includes("walking") &&
      !classes.includes("automotive") &&
      stepsPerSecond !== null &&
      stepsPerSecond !== undefined &&
      stepsPerSecond * 60 >= WALK_CADENCE_THRESHOLD_STEPS_PER_MINUTE
    );
  }

  private disqualifyImmediately(atMs: number): WalkVerdict {
    this.verified = false;
    this.graceEndsAt = undefined;
    return this.currentVerdict(atMs);
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
