import {
  REJECTED_FIELD_REASON,
  SHIPPED_STRIDE_GATE,
  SHIPPED_STRIDE_GATE_REPORT,
  STRIDE_GATE_FIELDS,
  STRIDE_GATE_FIELD_SPECS,
  STRIDE_GATE_FLAG_KEY,
  describeStrideGateReport,
  effectiveWalkingGraceMs,
  resolveStrideGateConfig,
  sameStrideGateParams,
  strideGateInvariant,
  type StrideGateField,
  type StrideGateParams,
} from '../strideGateConfig';
import * as StrideRhythm from '../StrideRhythm';
import { WALK_GRACE_MAX_MS, WALK_GRACE_MIN_MS, WALK_QUALIFY_MS, reduceWalking, type WalkingState } from '../../../domain/walkingMachine';

const payloadOf = (params: Record<string, number | string | boolean | null>) => resolveStrideGateConfig({ payload: params });
const inside = (field: StrideGateField): number => {
  const [min, max] = STRIDE_GATE_FIELD_SPECS[field].clamp;
  const shipped = SHIPPED_STRIDE_GATE[field];
  if (shipped >= min && shipped <= max) return shipped;
  return min;
};

describe('the shipped gate is the fallback and the default', () => {
  test('no payload at all is the shipped configuration, field for field', () => {
    const report = resolveStrideGateConfig();
    expect(report.source).toBe('shipped');
    expect(report.flagKey).toBe(STRIDE_GATE_FLAG_KEY);
    expect(report.killSwitch).toEqual({ requested: false, applied: false });
    expect(report.reason).toBeNull();
    expect(report.effective).toEqual(SHIPPED_STRIDE_GATE);
    expect(report).toBe(SHIPPED_STRIDE_GATE_REPORT);
    for (const field of STRIDE_GATE_FIELDS) {
      expect(report.fields[field]).toEqual({ requested: null, applied: SHIPPED_STRIDE_GATE[field], accepted: true, reason: null });
    }
  });

  test('the leading legacy constants are the shipped values, so today’s behaviour is unchanged', () => {
    expect(StrideRhythm.STRIDE_WINDOW_MS).toBe(SHIPPED_STRIDE_GATE.windowMs);
    expect(StrideRhythm.STRIDE_EVALUATION_INTERVAL_MS).toBe(SHIPPED_STRIDE_GATE.evaluationIntervalMs);
    expect(StrideRhythm.STRIDE_STALENESS_MS).toBe(SHIPPED_STRIDE_GATE.stalenessMs);
    expect(StrideRhythm.STRIDE_FILTER_HZ).toEqual({ low: SHIPPED_STRIDE_GATE.filterLowHz, high: SHIPPED_STRIDE_GATE.filterHighHz });
    expect(StrideRhythm.STRIDE_LAG_MS).toEqual({ low: SHIPPED_STRIDE_GATE.lagLowMs, high: SHIPPED_STRIDE_GATE.lagHighMs });
    expect(StrideRhythm.STRIDE_STILL_G).toBe(SHIPPED_STRIDE_GATE.stillG);
    expect(StrideRhythm.STRIDE_RECENT_MS).toBe(SHIPPED_STRIDE_GATE.recentMs);
    expect(StrideRhythm.STRIDE_WALK_MIN_G).toBe(SHIPPED_STRIDE_GATE.walkMinG);
    expect(StrideRhythm.STRIDE_VETO_MIN_G).toBe(SHIPPED_STRIDE_GATE.vetoMinG);
    expect(StrideRhythm.STRIDE_MIN_PERIODICITY).toBe(SHIPPED_STRIDE_GATE.minPeriodicity);
    expect(StrideRhythm.STRIDE_WALK_HZ).toEqual({ low: SHIPPED_STRIDE_GATE.walkLowHz, high: SHIPPED_STRIDE_GATE.walkHighHz });
    expect(StrideRhythm.STRIDE_VETO_HZ).toBe(SHIPPED_STRIDE_GATE.vetoHz);
    expect(StrideRhythm.STRIDE_MAX_INTERVAL_CV).toBe(SHIPPED_STRIDE_GATE.maxIntervalCv);
    expect(StrideRhythm.STRIDE_MAX_AXIS_PURITY).toBe(SHIPPED_STRIDE_GATE.maxAxisPurity);
    expect(StrideRhythm.STRIDE_VETO_AXIS_PURITY).toBe(SHIPPED_STRIDE_GATE.vetoAxisPurity);
    expect(StrideRhythm.STRIDE_MAX_ROTATION_RATIO).toBe(SHIPPED_STRIDE_GATE.maxRotationRatio);
    expect(StrideRhythm.STRIDE_VETO_ROTATION_RATIO).toBe(SHIPPED_STRIDE_GATE.vetoRotationRatio);
    expect(StrideRhythm.STRIDE_VETO_ROTATION_RMS).toBe(SHIPPED_STRIDE_GATE.vetoRotationRms);
    expect(StrideRhythm.STRIDE_WALK_DWELL).toBe(SHIPPED_STRIDE_GATE.walkDwell);
    expect(StrideRhythm.STRIDE_VETO_DWELL).toBe(SHIPPED_STRIDE_GATE.vetoDwell);
    expect(StrideRhythm.STRIDE_PENALTY_MS).toBe(SHIPPED_STRIDE_GATE.penaltyMs);
    expect(StrideRhythm.STRIDE_HZ_TOLERANCE).toBe(SHIPPED_STRIDE_GATE.hzTolerance);
  });

  test('every shipped value sits inside its own clamp (the credit cap excepted, which ships unbounded)', () => {
    for (const field of STRIDE_GATE_FIELDS) {
      const [min, max] = STRIDE_GATE_FIELD_SPECS[field].clamp;
      if (field === 'qualifyCreditMs') {
        // Unbounded by default: no gate-side cap, exactly today's evidence.
        expect(SHIPPED_STRIDE_GATE[field]).toBe(Number.POSITIVE_INFINITY);
        expect(max).toBe(WALK_QUALIFY_MS);
        continue;
      }
      expect(`${field} inside clamp`).toBe(SHIPPED_STRIDE_GATE[field] >= min && SHIPPED_STRIDE_GATE[field] <= max ? `${field} inside clamp` : `${field} outside clamp`);
      expect(`${field} ordered clamp`).toBe(min <= max ? `${field} ordered clamp` : `${field} inverted clamp`);
    }
  });

  test('the shipped gate satisfies every cross-field invariant', () => {
    expect(strideGateInvariant(SHIPPED_STRIDE_GATE)).toBeNull();
  });

  test('a valid payload is applied field for field and reports as remote', () => {
    const report = payloadOf({ stillG: 0.07, walkDwell: 10, vetoAxisPurity: 0.91 });
    expect(report.source).toBe('remote');
    expect(report.reason).toBeNull();
    expect(report.effective.stillG).toBe(0.07);
    expect(report.effective.walkDwell).toBe(10);
    expect(report.effective.vetoAxisPurity).toBe(0.91);
    expect(report.effective.windowMs).toBe(SHIPPED_STRIDE_GATE.windowMs);
    expect(report.fields.stillG).toEqual({ requested: 0.07, applied: 0.07, accepted: true, reason: null });
    expect(report.fields.windowMs).toEqual({ requested: null, applied: SHIPPED_STRIDE_GATE.windowMs, accepted: true, reason: null });
  });

  test('field-for-field comparison treats two shipped sets as equal', () => {
    expect(sameStrideGateParams(SHIPPED_STRIDE_GATE, { ...SHIPPED_STRIDE_GATE })).toBe(true);
    expect(sameStrideGateParams(SHIPPED_STRIDE_GATE, { ...SHIPPED_STRIDE_GATE, stillG: 0.07 })).toBe(false);
  });
});

describe('every clamp rejects and falls back wholesale', () => {
  const outOfClamp: [StrideGateField, number][] = STRIDE_GATE_FIELDS.flatMap((field) => {
    const [min, max] = STRIDE_GATE_FIELD_SPECS[field].clamp;
    const low = Number.isFinite(min) ? min - Math.max(Math.abs(min) * 0.01, 0.01) : min;
    const high = max + Math.max(Math.abs(max) * 0.01, 0.01);
    return [[field, low] as [StrideGateField, number], [field, high] as [StrideGateField, number]];
  });

  test.each(outOfClamp)('%s = %p is rejected and the whole payload falls back', (field, value) => {
    const report = payloadOf({ [field]: value });
    expect(report.source).toBe('rejected');
    expect(report.effective).toEqual(SHIPPED_STRIDE_GATE);
    expect(report.reason).toContain(field);
    expect(report.fields[field].accepted).toBe(false);
    expect(report.fields[field].applied).toBe(SHIPPED_STRIDE_GATE[field]);
    for (const other of STRIDE_GATE_FIELDS) expect(report.fields[other].applied).toBe(SHIPPED_STRIDE_GATE[other]);
  });

  test('a value inside the clamp is accepted for every field', () => {
    for (const field of STRIDE_GATE_FIELDS) {
      const value = inside(field);
      const report = payloadOf({ [field]: value });
      expect(`${field}: ${report.source}`).toBe(`${field}: remote`);
      expect(`${field}=${report.effective[field]}`).toBe(`${field}=${value}`);
    }
  });

  test('one bad field rejects the good ones with it', () => {
    const report = payloadOf({ stillG: 0.07, maxRotationRatio: 0.5 });
    expect(report.source).toBe('rejected');
    expect(report.reason).toContain('maxRotationRatio');
    expect(report.effective.stillG).toBe(SHIPPED_STRIDE_GATE.stillG);
    expect(report.fields.stillG).toEqual({ requested: 0.07, applied: SHIPPED_STRIDE_GATE.stillG, accepted: true, reason: REJECTED_FIELD_REASON });
  });

  test('wrong types and unparseable payloads fall back with a reason', () => {
    for (const payload of ['stillG', 42, true, ['stillG'], null]) {
      const report = resolveStrideGateConfig({ payload });
      expect(report.source).toBe('rejected');
      expect(report.effective).toEqual(SHIPPED_STRIDE_GATE);
      expect(report.reason).not.toBeNull();
    }
    expect(resolveStrideGateConfig({ payload: { stillG: '0.07' } }).reason).toContain('stillG');
    expect(resolveStrideGateConfig({ payload: { stillG: Number.NaN } }).reason).toContain('stillG');
    expect(resolveStrideGateConfig({ payload: { walkDwell: Number.POSITIVE_INFINITY } }).reason).toContain('walkDwell');
    expect(resolveStrideGateConfig({ payload: { walkDwell: 9.5 } }).reason).toContain('integer');
  });

  test('an unknown key rejects the payload instead of being ignored', () => {
    const report = resolveStrideGateConfig({ payload: { stillG: 0.07, walkDwelll: 10 } });
    expect(report.source).toBe('rejected');
    expect(report.reason).toContain('walkDwelll');
    expect(report.effective).toEqual(SHIPPED_STRIDE_GATE);
  });

  test('a non-boolean kill switch is malformed', () => {
    const report = resolveStrideGateConfig({ payload: { killSwitch: 'yes' } });
    expect(report.source).toBe('rejected');
    expect(report.reason).toContain('killSwitch');
    expect(report.killSwitch).toEqual({ requested: false, applied: false });
  });
});

describe('cross-field invariants reject combinations that are individually in range', () => {
  const violations: [string, Record<string, number>][] = [
    ['a span floor at the window itself', { windowMs: 2_800, minSpanMs: 2_800 }],
    ['a recent slice longer than half the window', { windowMs: 2_800, recentMs: 1_500 }],
    ['a veto band under the walking band top', { walkHighHz: 2.3, vetoHz: 2.2 }],
    ['a purity veto at the stride ceiling', { maxAxisPurity: 0.9, vetoAxisPurity: 0.9 }],
    ['a dwell the Apple path would beat', { walkDwell: 48, evaluationIntervalMs: 1_000 }],
    ['a grace floor above its ceiling', { graceMinMs: 300_000, graceMaxMs: 30_000 }],
  ];

  test.each(violations)('%s is rejected wholesale', (_name, payload) => {
    const report = resolveStrideGateConfig({ payload });
    expect(report.source).toBe('rejected');
    expect(report.reason).toContain('invariant');
    expect(report.effective).toEqual(SHIPPED_STRIDE_GATE);
  });

  test('an impossible band is caught by the clamp before the invariant can see it', () => {
    const report = resolveStrideGateConfig({ payload: { walkLowHz: 3.4, walkHighHz: 0.4 } });
    expect(report.source).toBe('rejected');
    expect(report.reason).toContain('walkLowHz');
  });
});

describe('the kill switch', () => {
  test('a payload kill switch applies, reports, and leaves the shipped gate in effect', () => {
    const report = resolveStrideGateConfig({ payload: { killSwitch: true, stillG: 0.07 } });
    expect(report.source).toBe('remote');
    expect(report.killSwitch).toEqual({ requested: true, applied: true });
    expect(report.effective).toEqual(SHIPPED_STRIDE_GATE);
    expect(report.fields.stillG).toEqual({ requested: 0.07, applied: SHIPPED_STRIDE_GATE.stillG, accepted: true, reason: 'kill switch in effect: the raw-stream gate is off' });
  });

  test('an explicit kill switch needs no payload', () => {
    const report = resolveStrideGateConfig({ killSwitch: true });
    expect(report.source).toBe('remote');
    expect(report.killSwitch).toEqual({ requested: true, applied: true });
  });

  test('a rejected payload never applies its kill switch', () => {
    const report = resolveStrideGateConfig({ payload: { killSwitch: true, stillG: 1 } });
    expect(report.source).toBe('rejected');
    expect(report.killSwitch).toEqual({ requested: true, applied: false });
  });

  test('killSwitch: false leaves the gate armed', () => {
    const report = resolveStrideGateConfig({ payload: { killSwitch: false } });
    expect(report.source).toBe('remote');
    expect(report.killSwitch).toEqual({ requested: false, applied: false });
    expect(report.effective).toEqual(SHIPPED_STRIDE_GATE);
  });
});

describe('the effective configuration is observable', () => {
  test('the description names the source, the flag, the applied values and the rejections', () => {
    const applied = describeStrideGateReport(payloadOf({ stillG: 0.07, killSwitch: false }));
    expect(applied).toContain(`source=remote`);
    expect(applied).toContain(STRIDE_GATE_FLAG_KEY);
    expect(applied).toContain('killSwitch=off');
    expect(applied).toContain('stillG=0.07');
    expect(applied).toContain('rejected=none');

    const rejected = describeStrideGateReport(payloadOf({ stillG: 1 }));
    expect(rejected).toContain('source=rejected');
    expect(rejected).toContain('rejected=stillG(');
    expect(rejected).toContain('reason=');

    const shipped = describeStrideGateReport(SHIPPED_STRIDE_GATE_REPORT);
    expect(shipped).toContain('source=shipped');
    expect(shipped).toContain('fields=shipped defaults');
  });

  test('the credit cap renders as unbounded rather than as a number', () => {
    expect(describeStrideGateReport(SHIPPED_STRIDE_GATE_REPORT)).not.toContain('Infinity');
  });
});

describe('the grace bounds keep the reducer contract', () => {
  const userPrefs = [0, 1, WALK_GRACE_MIN_MS, 45_000, 120_000, WALK_GRACE_MAX_MS, 10 * WALK_GRACE_MAX_MS, Number.NaN];

  test('with the shipped bounds the user’s own preference is passed through', () => {
    expect(effectiveWalkingGraceMs(SHIPPED_STRIDE_GATE, 30_000)).toBe(30_000);
    expect(effectiveWalkingGraceMs(SHIPPED_STRIDE_GATE, 120_000)).toBe(120_000);
    expect(effectiveWalkingGraceMs(SHIPPED_STRIDE_GATE, 300_000)).toBe(300_000);
    expect(effectiveWalkingGraceMs(SHIPPED_STRIDE_GATE, 0)).toBe(WALK_GRACE_MIN_MS);
  });

  test('a remote bound can only move the effective grace inside the reducer contract', () => {
    const narrowed = resolveStrideGateConfig({ payload: { graceMinMs: 60_000, graceMaxMs: 60_000 } }).effective;
    for (const user of userPrefs) expect(effectiveWalkingGraceMs(narrowed, user)).toBe(60_000);
  });

  test('the reducer accepts every grace the port can produce, whatever the preference', () => {
    const parked: WalkingState = { version: 1, phase: 'active', watermark: 10_000, qualifyingSince: 1_000, activeSince: 1_000, lastEvidenceAt: 9_000, lastQualifying: true, graceEndsAt: null };
    const bounds: StrideGateParams[] = [SHIPPED_STRIDE_GATE, resolveStrideGateConfig({ payload: { graceMinMs: 300_000, graceMaxMs: 300_000 } }).effective, resolveStrideGateConfig({ payload: { graceMinMs: 30_000, graceMaxMs: 30_000 } }).effective];
    for (const params of bounds) {
      for (const user of userPrefs) {
        const graceMs = effectiveWalkingGraceMs(params, user);
        expect(`${params.graceMinMs}..${params.graceMaxMs} for ${user}: ${graceMs >= WALK_GRACE_MIN_MS && graceMs <= WALK_GRACE_MAX_MS}`).toBe(
          `${params.graceMinMs}..${params.graceMaxMs} for ${user}: true`,
        );
        expect(() => reduceWalking(parked, { kind: 'evidence', at: 10_000, qualifying: false }, 10_000, graceMs)).not.toThrow();
      }
    }
  });
});
