import { WALK_GRACE_MAX_MS, WALK_GRACE_MIN_MS, WALK_QUALIFY_MS } from '../../domain/walkingMachine';

export const STRIDE_GATE_FLAG_KEY = 'stride_gate_config';

export const SHIPPED_STRIDE_GATE = Object.freeze({
  windowMs: 3_000,
  evaluationIntervalMs: 250,
  stalenessMs: 2_000,
  filterLowHz: 0.8,
  filterHighHz: 3.5,
  lagLowMs: 300,
  lagHighMs: 850,
  minCoverage: 0.6,
  minSpanMs: 2_700,
  peakMinDistanceMs: 220,
  peakHeightFraction: 0.35,
  stillG: 0.06,
  recentMs: 1_000,
  walkMinG: 0.08,
  vetoMinG: 0.1,
  minPeriodicity: 0.4,
  walkLowHz: 1.2,
  walkHighHz: 2.3,
  vetoHz: 2.4,
  maxIntervalCv: 0.45,
  maxAxisPurity: 0.9,
  vetoAxisPurity: 0.92,
  maxRotationRatio: 4.0,
  vetoRotationRatio: 8.0,
  vetoRotationRms: 1.0,
  walkDwell: 8,
  vetoDwell: 2,
  penaltyMs: 8_000,
  hzTolerance: 0.15,
  qualifyCreditMs: Number.POSITIVE_INFINITY,
  graceMinMs: WALK_GRACE_MIN_MS,
  graceMaxMs: WALK_GRACE_MAX_MS,
  stillStopMs: 10_000,
});

export type StrideGateField = keyof typeof SHIPPED_STRIDE_GATE;
export type StrideGateParams = Readonly<Record<StrideGateField, number>>;

type StrideGateFieldSpec = {
  readonly clamp: readonly [number, number];
  readonly integer?: true;
  readonly hostile: number;
  readonly note: string;
};

export const STRIDE_GATE_FIELD_SPECS: Readonly<Record<StrideGateField, StrideGateFieldSpec>> = {
  windowMs: {
    clamp: [2_800, 3_000],
    hostile: 3_000,
    note: 'The window may only shrink. Measured on the captures: a 4 s window lifts the longest stride-class run on a shake from 5 to 10 evaluations at the shipped cadence, because a longer window keeps a gentle bounce inside the walking distribution; a shorter one cannot (2 s produced no stride-class window at all). The floor keeps two of the longest searched lags (2 x 850 ms) inside the window.',
  },
  evaluationIntervalMs: {
    clamp: [250, 1_000],
    hostile: 250,
    note: 'The evaluation cadence may only slow down. The captured margin for the 8-evaluation dwell was measured at 250 ms; at 125 ms the same shake reaches 9 consecutive stride-class evaluations instead of 5, halving the dwell\'s wall-clock protection. A slower cadence is bounded by the cross-field invariant (dwell x interval <= 12 s, the Apple path\'s own latency).',
  },
  stalenessMs: {
    clamp: [500, 2_000],
    hostile: 2_000,
    note: 'A verdict may only be made to expire sooner: 2 s is already below the 5 s Apple-evidence freshness contract, and a longer life would let a `walking` verdict outlive its stream.',
  },
  filterLowHz: {
    clamp: [0.5, 1.0],
    hostile: 0.5,
    note: 'The low corner stays under the walking band\'s measured p1 (1.25 Hz), so gait energy is never filtered out; 0.5 Hz is the practical floor for a 3 s window.',
  },
  filterHighHz: {
    clamp: [2.4, 5.0],
    hostile: 2.4,
    note: 'The high corner must stay at or above the veto frequency, so the fast-motion veto survives the filter; 5 Hz is a tenth of the native 50 Hz sample rate.',
  },
  lagLowMs: {
    clamp: [250, 400],
    hostile: 250,
    note: 'Shortest searched step lag: 250 ms is 4 Hz, still above the fastest measured shake harmonic, so the peak search never reads a fast vibration as a step; 400 ms still overlaps the walking band top.',
  },
  lagHighMs: {
    clamp: [800, 1_000],
    hostile: 1_000,
    note: 'Longest searched step lag: the walking band\'s slowest measured value (p1 1.25 Hz) is an 800 ms step, so the band may only be extended to 1 s, never narrowed out of the walking distribution.',
  },
  minCoverage: {
    clamp: [0.5, 0.75],
    hostile: 0.5,
    note: 'Share of the window that must be gridded from real 50 Hz samples: below 0.5 the periodicity estimate stands on less than half a window, above 0.75 normal receipt jitter would starve the window.',
  },
  minSpanMs: {
    clamp: [2_000, 2_800],
    hostile: 2_000,
    note: 'Covered span needed before an evaluation: at least two longest lags (2 x 850 ms) and always at least 20 ms below the window itself - the analyzer can only ever cover a span just under windowMs, so a higher floor would freeze the leg at `unknown` (measured: 3 000 ms with the shipped window produced no evaluation at all).',
  },
  peakMinDistanceMs: {
    clamp: [150, 250],
    hostile: 150,
    note: 'Peak separation: 150 ms is 6.7 Hz, still above every measured shake harmonic, and it must stay under the shortest searched step lag so the interval CV never merges two real steps.',
  },
  peakHeightFraction: {
    clamp: [0.2, 0.5],
    hostile: 0.2,
    note: 'Peak floor relative to the band-passed RMS: under 0.2 the CV counts noise peaks, over 0.5 fewer than three peaks are found and the CV falls back to its 9.9 sentinel (which blocks every stride).',
  },
  stillG: {
    clamp: [0.06, 0.07],
    hostile: 0.06,
    note: 'The still floor may only be raised: the spent f09377f9 shake measured recent RMS 0.049 g, so lowering the floor would let a hand that has already stopped pass the still-stepping test; walking p5 is 0.06 g, so it may not rise much above its shipped value either.',
  },
  recentMs: {
    clamp: [500, 1_500],
    hostile: 1_500,
    note: '"Still stepping now" is a recent-motion test: at least half a second, and never more than half the window. The longer the slice, the more of the window\'s older motion can carry a body that has already stopped; measured on the captures the two endpoints are neutral (the spent f09377f9 tail is 1 s old, inside both), so the shipped 1 s sits between them.',
  },
  walkMinG: {
    clamp: [0.08, 0.1],
    hostile: 0.08,
    note: 'The stride floor may only be raised from the shipped 0.08 g: shaking windows measured a p5 of 0.08 g and sitting p95 0.11 g, while walking p5 is 0.06 g, so raising it far would drop real slow walks.',
  },
  vetoMinG: {
    clamp: [0.1, 0.15],
    hostile: 0.1,
    note: 'A non-gait verdict must stand on at least as much motion as a stride claim (a cross-field invariant keeps it >= walkMinG); sitting p95 is 0.11 g.',
  },
  minPeriodicity: {
    clamp: [0.4, 0.6],
    hostile: 0.4,
    note: 'Periodicity floor: walking p5 is 0.26 and p50 0.67, so the floor may only be raised toward the walking median, never lowered into the aperiodic half of the walking distribution (0.6 keeps the confirmed walks).',
  },
  walkLowHz: {
    clamp: [1.2, 1.4],
    hostile: 1.2,
    note: 'Walking band floor may only be raised: the shipped 1.2 Hz already sits below walking p1 (1.25 Hz), and lowering it would admit the shaking p5 (1.28 Hz).',
  },
  walkHighHz: {
    clamp: [2.1, 2.3],
    hostile: 2.3,
    note: 'Walking band top may only be lowered: walking p95 is 2.08 Hz and shaking p50 is 2.22 Hz, so 2.3 Hz is the measured boundary the band may never cross.',
  },
  vetoHz: {
    clamp: [2.2, 2.4],
    hostile: 2.4,
    note: 'The frequency veto may only be lowered: raising it above the shipped 2.4 Hz would let the shaking p95 (3.33 Hz) escape the veto that keeps the pedometer from standing alone; a cross-field invariant keeps it above walkHighHz.',
  },
  maxIntervalCv: {
    clamp: [0.35, 0.45],
    hostile: 0.45,
    note: 'Inter-peak CV ceiling may only be lowered: walking p95 is 0.37 and p99 0.50, so 0.45 is the top of the walking distribution and raising it would admit the shaking p95 (0.70).',
  },
  maxAxisPurity: {
    clamp: [0.85, 0.9],
    hostile: 0.9,
    note: 'Stride purity ceiling may only be lowered: shaking p50 is 0.86 and p95 0.96 while walking p95 is 0.89, so 0.90 is the measured separator and may never rise.',
  },
  vetoAxisPurity: {
    clamp: [0.9, 0.92],
    hostile: 0.92,
    note: 'Veto purity bound may only be lowered, and an invariant keeps it above the stride ceiling, so a window that just missed the stride class does not immediately become a veto that also blocks the pedometer leg.',
  },
  maxRotationRatio: {
    clamp: [3.0, 4.0],
    hostile: 4.0,
    note: 'Stride rotation ceiling may only be lowered: walking p95 is 4.46, and raising it above the shipped 4.0 starts admitting the shaking p50 (3.16)-p95 (10.50) rotation-dominated band.',
  },
  vetoRotationRatio: {
    clamp: [8.0, 9.0],
    hostile: 9.0,
    note: 'Rotation veto bound: 8.0 is the measured gap between walking p99 (5.68) and the shaking p95 (10.50); the clamp allows at most one unit of slack so the handling veto keeps covering the shakes.',
  },
  vetoRotationRms: {
    clamp: [1.0, 1.5],
    hostile: 1.5,
    note: 'Handling threshold in rad/s: sitting-handling p95 is 0.75 and shaking p50 1.04, so it may only be raised from 1.0 rad/s (58 deg/s), never lowered into the carrying band.',
  },
  walkDwell: {
    clamp: [8, 48],
    integer: true,
    hostile: 8,
    note: 'Consecutive stride evaluations before `walking`: the longest stride-class run on a shake was exactly 8 (blocked only by the 8 s penalty), so the dwell may never drop below the shipped 8; the ceiling is 48 evaluations, the most the cross-field dwell x interval invariant admits at the shipped cadence.',
  },
  vetoDwell: {
    clamp: [2, 3],
    integer: true,
    hostile: 3,
    note: 'Consecutive non-gait evaluations before `notStride`: a single evaluation is never enough to veto, and the captured shakes` non-gait phases (1.5-9.4 s) are long enough that a third evaluation adds little while a fourth would delay the veto.',
  },
  penaltyMs: {
    clamp: [8_000, 12_000],
    hostile: 8_000,
    note: 'Post-veto penalty may only be raised: 8 s is what covers the measured 1.5-9.4 s handling gaps inside a shake, and it is the second half of the margin that keeps the f09377f9 shake from publishing (the first is the dwell).',
  },
  hzTolerance: {
    clamp: [0.1, 0.2],
    hostile: 0.2,
    note: 'Step-frequency stability across the dwell: the band must absorb natural stride variation (the capture walks alternate 1.4-1.9 Hz) without accepting a change of rhythm.',
  },
  qualifyCreditMs: {
    clamp: [1_000, WALK_QUALIFY_MS],
    hostile: WALK_QUALIFY_MS,
    note: 'Credit toward the reducer\'s qualification may only shrink, and never below one second; the reducer itself caps the claim at WALK_QUALIFY_MS (3 s), so a remote value inside that range can never shorten relief by more than 3 s or extend it at all.',
  },
  graceMinMs: {
    clamp: [WALK_GRACE_MIN_MS, WALK_GRACE_MAX_MS],
    hostile: WALK_GRACE_MAX_MS,
    note: 'Lower bound applied to the user\'s own stop-grace; the reducer contract (30 s-5 min) is the clamp, so no remote value can hand the reducer a grace it would reject or a relief longer than a user can already select.',
  },
  graceMaxMs: {
    clamp: [WALK_GRACE_MIN_MS, WALK_GRACE_MAX_MS],
    hostile: WALK_GRACE_MAX_MS,
    note: 'Upper bound applied to the user\'s own stop-grace, inside the same reducer contract.',
  },
  stillStopMs: {
    clamp: [5_000, 60_000],
    hostile: 60_000,
    note: 'Measured stillness that ends relief: the floor keeps one full window plus one evaluation of margin over the longest stillness inside any captured walk (4.8 s, treadmill belt ramps); the ceiling is longer than the silence plus the shipped grace, i.e. it never fires before the grace does, which is the pre-change behaviour.',
  },
};

export const STRIDE_GATE_FIELDS = Object.keys(SHIPPED_STRIDE_GATE) as readonly StrideGateField[];
const STRIDE_GATE_FIELD_SET: ReadonlySet<string> = new Set(STRIDE_GATE_FIELDS);
const KILL_SWITCH_KEY = 'killSwitch';

export type StrideGateFieldReport = {
  readonly requested: number | null;
  readonly applied: number;
  readonly accepted: boolean;
  readonly reason: string | null;
};

export type StrideGateKillSwitch = { readonly requested: boolean; readonly applied: boolean };

export type StrideGateSource = 'remote' | 'shipped' | 'rejected';

export type StrideGateReport = {
  readonly source: StrideGateSource;
  readonly flagKey: typeof STRIDE_GATE_FLAG_KEY;
  readonly killSwitch: StrideGateKillSwitch;
  readonly effective: StrideGateParams;
  readonly fields: Readonly<Record<StrideGateField, StrideGateFieldReport>>;
  readonly reason: string | null;
};

function shippedFields(): Record<StrideGateField, StrideGateFieldReport> {
  const fields = {} as Record<StrideGateField, StrideGateFieldReport>;
  for (const field of STRIDE_GATE_FIELDS) {
    fields[field] = { requested: null, applied: SHIPPED_STRIDE_GATE[field], accepted: true, reason: null };
  }
  return fields;
}

function shippedReport(): StrideGateReport {
  return Object.freeze({
    source: 'shipped',
    flagKey: STRIDE_GATE_FLAG_KEY,
    killSwitch: Object.freeze({ requested: false, applied: false }),
    effective: SHIPPED_STRIDE_GATE,
    fields: Object.freeze(shippedFields()),
    reason: null,
  });
}

export const SHIPPED_STRIDE_GATE_REPORT: StrideGateReport = shippedReport();

export function strideGateInvariant(params: StrideGateParams): string | null {
  const fail = (rule: string): string => rule;
  if (params.minSpanMs > params.windowMs - 20) return fail('minSpanMs must stay at least 20 ms below windowMs (the analyzer can only cover a span just under the window)');
  if (params.minSpanMs < 2 * params.lagHighMs) return fail('minSpanMs must cover two of the longest searched lags (2 x lagHighMs)');
  if (params.evaluationIntervalMs > params.windowMs) return fail('evaluationIntervalMs must not exceed windowMs');
  if (params.recentMs > params.windowMs / 2) return fail('recentMs must stay within half the window');
  if (params.lagLowMs >= params.lagHighMs) return fail('lagLowMs must be below lagHighMs');
  if (params.filterLowHz >= params.filterHighHz) return fail('filterLowHz must be below filterHighHz');
  if (params.stillG > params.walkMinG) return fail('stillG must not exceed walkMinG');
  if (params.walkMinG > params.vetoMinG) return fail('vetoMinG must not be below walkMinG');
  if (params.walkLowHz >= params.walkHighHz) return fail('walkLowHz must be below walkHighHz');
  if (params.walkHighHz >= params.vetoHz) return fail('vetoHz must stay above the walking band top');
  if (params.maxAxisPurity >= params.vetoAxisPurity) return fail('vetoAxisPurity must stay above maxAxisPurity');
  if (params.maxRotationRatio >= params.vetoRotationRatio) return fail('vetoRotationRatio must stay above maxRotationRatio');
  if (params.vetoDwell > params.walkDwell) return fail('vetoDwell must not exceed walkDwell');
  if (params.walkDwell * params.evaluationIntervalMs > 12_000) return fail('the stride dwell must confirm within the Apple path\'s latency (walkDwell x evaluationIntervalMs must not exceed 12 s)');
  if (params.graceMinMs > params.graceMaxMs) return fail('graceMinMs must not exceed graceMaxMs');
  return null;
}

type FieldEvaluation = {
  readonly values: StrideGateParams;
  readonly fields: Record<StrideGateField, StrideGateFieldReport>;
  readonly rejected: string | null;
};

function evaluateFields(requested: Readonly<Record<string, unknown>>): FieldEvaluation {
  const values = { ...SHIPPED_STRIDE_GATE } as Record<StrideGateField, number>;
  const fields = {} as Record<StrideGateField, StrideGateFieldReport>;
  const rejectedNotes: string[] = [];
  for (const field of STRIDE_GATE_FIELDS) {
    const spec = STRIDE_GATE_FIELD_SPECS[field];
    const shipped = SHIPPED_STRIDE_GATE[field];
    const raw = Object.prototype.hasOwnProperty.call(requested, field) ? requested[field] : undefined;
    if (raw === undefined || raw === null) {
      fields[field] = { requested: null, applied: shipped, accepted: true, reason: null };
      continue;
    }
    if (typeof raw !== 'number' || !Number.isFinite(raw)) {
      fields[field] = { requested: null, applied: shipped, accepted: false, reason: 'not a finite number' };
      rejectedNotes.push(`${field} is not a finite number`);
      continue;
    }
    if (spec.integer === true && !Number.isInteger(raw)) {
      fields[field] = { requested: raw, applied: shipped, accepted: false, reason: 'not an integer' };
      rejectedNotes.push(`${field} must be an integer`);
      continue;
    }
    const [min, max] = spec.clamp;
    if (raw < min || raw > max) {
      const bound = raw < min ? `below ${min}` : `above ${max}`;
      fields[field] = { requested: raw, applied: shipped, accepted: false, reason: `${bound} (clamp ${min}..${max})` };
      rejectedNotes.push(`${field} is ${bound} its clamp ${min}..${max}`);
      continue;
    }
    fields[field] = { requested: raw, applied: raw, accepted: true, reason: null };
    values[field] = raw;
  }
  if (rejectedNotes.length) return { values: SHIPPED_STRIDE_GATE, fields, rejected: `clamped out of range: ${rejectedNotes.join('; ')}` };
  const invariant = strideGateInvariant(values);
  if (invariant !== null) return { values: SHIPPED_STRIDE_GATE, fields, rejected: `invariant violated: ${invariant}` };
  return { values, fields, rejected: null };
}

const emptyEvaluation = (): FieldEvaluation => ({ values: SHIPPED_STRIDE_GATE, fields: shippedFields(), rejected: null });

const KILL_SWITCH_APPLIED_REASON = 'kill switch in effect: the raw-stream gate is off';
export const KILL_SWITCH_FIELD_REASON = KILL_SWITCH_APPLIED_REASON;
export const REJECTED_FIELD_REASON = 'payload rejected: the shipped gate applies';

function reportFrom(
  source: StrideGateSource,
  evaluation: FieldEvaluation,
  killSwitch: StrideGateKillSwitch,
  reason: string | null,
): StrideGateReport {
  const fields = { ...evaluation.fields };
  const applied = source === 'remote' && !killSwitch.applied;
  const effective = applied ? evaluation.values : SHIPPED_STRIDE_GATE;
  if (!applied) {
    const fieldReason = source === 'rejected' ? REJECTED_FIELD_REASON : KILL_SWITCH_APPLIED_REASON;
    for (const field of STRIDE_GATE_FIELDS) {
      const entry = fields[field];
      if (entry.requested === null) continue;
      fields[field] = { ...entry, applied: SHIPPED_STRIDE_GATE[field], reason: entry.accepted ? fieldReason : entry.reason };
    }
  }
  return Object.freeze({
    source,
    flagKey: STRIDE_GATE_FLAG_KEY,
    killSwitch,
    effective: Object.freeze(effective),
    fields: Object.freeze(fields),
    reason,
  });
}

function readKillSwitch(payload: Record<string, unknown>): { readonly requested: boolean } | { readonly rejected: string } {
  const raw = payload[KILL_SWITCH_KEY];
  if (raw === undefined) return { requested: false };
  if (typeof raw !== 'boolean') return { rejected: `${KILL_SWITCH_KEY} must be a boolean` };
  return { requested: raw };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export type StrideGateInput = {
  readonly payload?: unknown;
  readonly params?: Readonly<Record<string, unknown>>;
  readonly killSwitch?: boolean;
};

export function resolveStrideGateConfig(input: StrideGateInput = {}): StrideGateReport {
  try {
    const hasParams = input.params !== undefined;
    const hasPayload = input.payload !== undefined;
    if (!hasParams && !hasPayload && input.killSwitch === undefined) return SHIPPED_STRIDE_GATE_REPORT;
    if (!hasParams && !hasPayload && input.killSwitch === false) return SHIPPED_STRIDE_GATE_REPORT;

    let params: Readonly<Record<string, unknown>> = {};
    let killSwitchRequested = false;
    if (hasPayload) {
      if (!isPlainObject(input.payload)) {
        return reportFrom('rejected', emptyEvaluation(), { requested: false, applied: false }, 'payload is not a JSON object');
      }
      const killSwitch = readKillSwitch(input.payload);
      if ('rejected' in killSwitch) {
        return reportFrom('rejected', emptyEvaluation(), { requested: false, applied: false }, killSwitch.rejected);
      }
      killSwitchRequested = killSwitch.requested;
      params = input.payload;
    }
    if (hasParams) params = { ...params, ...input.params };
    if (input.killSwitch !== undefined) killSwitchRequested = input.killSwitch;

    const unknown = Object.keys(params).filter((key) => key !== KILL_SWITCH_KEY && !STRIDE_GATE_FIELD_SET.has(key));
    if (unknown.length) {
      return reportFrom('rejected', evaluateFields(params), { requested: killSwitchRequested, applied: false }, `unknown parameter${unknown.length > 1 ? 's' : ''}: ${unknown.join(', ')}`);
    }
    const evaluation = evaluateFields(params);
    if (evaluation.rejected !== null) {
      return reportFrom('rejected', evaluation, { requested: killSwitchRequested, applied: false }, evaluation.rejected);
    }
    return reportFrom('remote', evaluation, { requested: killSwitchRequested, applied: killSwitchRequested }, null);
  } catch (error) {
    return reportFrom('rejected', emptyEvaluation(), { requested: false, applied: false }, `payload could not be read: ${error instanceof Error ? error.message : 'unknown error'}`);
  }
}

export function sameStrideGateParams(a: StrideGateParams, b: StrideGateParams): boolean {
  return STRIDE_GATE_FIELDS.every((field) => a[field] === b[field]);
}

export function describeStrideGateReport(report: StrideGateReport): string {
  const render = (value: number): string => (value === Number.POSITIVE_INFINITY ? 'unbounded' : `${value}`);
  const changed = STRIDE_GATE_FIELDS.filter((field) => report.fields[field].requested !== null).map((field) => {
    const entry = report.fields[field];
    return `${field}=${render(entry.applied)}${entry.accepted ? '' : '!'}`;
  });
  const rejected = STRIDE_GATE_FIELDS.filter((field) => !report.fields[field].accepted).map((field) => `${field}(${report.fields[field].reason ?? 'rejected'})`);
  return [
    `${report.flagKey} source=${report.source}`,
    `killSwitch=${report.killSwitch.applied ? 'on' : 'off'}`,
    `fields=${changed.length ? changed.join(',') : 'shipped defaults'}`,
    `rejected=${rejected.length ? rejected.join(',') : 'none'}`,
    report.reason === null ? null : `reason=${report.reason}`,
  ]
    .filter((part): part is string => part !== null)
    .join(' ');
}

export function effectiveWalkingGraceMs(params: StrideGateParams, userGraceMs: number): number {
  const requested = Number.isFinite(userGraceMs) ? userGraceMs : WALK_GRACE_MAX_MS;
  const bounded = Math.min(Math.max(requested, params.graceMinMs), params.graceMaxMs);
  return Math.min(Math.max(bounded, WALK_GRACE_MIN_MS), WALK_GRACE_MAX_MS);
}
