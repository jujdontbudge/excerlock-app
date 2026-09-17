import { createStrideGateConfigPort } from '../createStrideGateConfigPort';
import { SHIPPED_STRIDE_GATE, describeStrideGateReport, type StrideGateReport } from '../strideGateConfig';

function setup(payloads: readonly unknown[], extra: { failAt?: number } = {}) {
  const applied: StrideGateReport[] = [];
  const observed: StrideGateReport[] = [];
  const errors: unknown[] = [];
  let reads = 0;
  const port = createStrideGateConfigPort({
    async readPayload() {
      const index = reads;
      reads += 1;
      if (extra.failAt === index) throw new Error('flag rail down');
      return payloads[Math.min(index, payloads.length - 1)];
    },
    apply: (report) => applied.push(report),
    onReport: (report) => observed.push(report),
    reportError: (error) => errors.push(error),
  });
  return { port, applied, observed, errors, reads: () => reads };
}

describe('the port resolves the flag rail into the gate the adapter runs', () => {
  test('a valid payload is resolved, applied and reported once', async () => {
    const s = setup([{ stillG: 0.07, walkDwell: 10 }]);
    const report = await s.port.sync();
    expect(report.source).toBe('remote');
    expect(report.effective.stillG).toBe(0.07);
    expect(s.applied).toEqual([report]);
    expect(s.observed).toEqual([report]);
    expect(s.port.report()).toBe(report);
    expect(s.errors).toEqual([]);
  });

  test('no payload applies the shipped gate and reports as shipped', async () => {
    const s = setup([undefined]);
    const report = await s.port.sync();
    expect(report.source).toBe('shipped');
    expect(report.effective).toEqual(SHIPPED_STRIDE_GATE);
    expect(s.applied).toEqual([report]);
  });

  test('a malformed payload applies the shipped gate with the reason visible', async () => {
    const s = setup([{ stillG: 5 }]);
    const report = await s.port.sync();
    expect(report.source).toBe('rejected');
    expect(report.reason).toContain('stillG');
    expect(report.effective).toEqual(SHIPPED_STRIDE_GATE);
    expect(s.applied).toEqual([report]);
    expect(describeStrideGateReport(report)).toContain('source=rejected');
  });

  test('a payload that disappears reverts the app to the shipped gate', async () => {
    const s = setup([{ stillG: 0.07 }, undefined]);
    expect((await s.port.sync()).effective.stillG).toBe(0.07);
    const second = await s.port.sync();
    expect(second.source).toBe('shipped');
    expect(second.effective).toEqual(SHIPPED_STRIDE_GATE);
    expect(s.applied).toHaveLength(2);
  });

  test('a failed read applies the shipped gate, reports the error and never rejects', async () => {
    const s = setup([{ stillG: 0.07 }], { failAt: 0 });
    const report = await s.port.sync();
    expect(report.source).toBe('shipped');
    expect(report.effective).toEqual(SHIPPED_STRIDE_GATE);
    expect(s.errors).toHaveLength(1);
    expect(s.applied).toEqual([report]);
  });

  test('a failing read after a remote payload applies does not keep the stale remote gate', async () => {
    const s = setup([{ stillG: 0.07 }, undefined], { failAt: 1 });
    expect((await s.port.sync()).effective.stillG).toBe(0.07);
    const second = await s.port.sync();
    expect(second.effective).toEqual(SHIPPED_STRIDE_GATE);
    expect(s.errors).toHaveLength(1);
  });

  test('a kill-switch payload reaches the consumer as an applied kill switch', async () => {
    const s = setup([{ killSwitch: true }]);
    const report = await s.port.sync();
    expect(report.killSwitch).toEqual({ requested: true, applied: true });
    expect(report.effective).toEqual(SHIPPED_STRIDE_GATE);
    expect(s.applied[0]?.killSwitch.applied).toBe(true);
  });

  test('concurrent syncs share one read', async () => {
    const s = setup([{ stillG: 0.07 }]);
    const [first, second] = await Promise.all([s.port.sync(), s.port.sync()]);
    expect(s.reads()).toBe(1);
    expect(first).toBe(second);
    expect(s.applied).toHaveLength(1);
  });

  test('the next sync after the in-flight one reads again', async () => {
    const s = setup([{ stillG: 0.07 }, { stillG: 0.065 }]);
    await s.port.sync();
    await s.port.sync();
    expect(s.reads()).toBe(2);
  });
});

describe('the effective grace is the user’s preference inside the accepted bounds', () => {
  test('before any sync the shipped bounds apply and change nothing', async () => {
    const s = setup([{ graceMinMs: 60_000 }]);
    expect(s.port.walkingGraceMs(30_000)).toBe(30_000);
    expect(s.port.walkingGraceMs(90_000)).toBe(90_000);
    await s.port.sync();
    expect(s.port.walkingGraceMs(30_000)).toBe(60_000);
    expect(s.port.walkingGraceMs(90_000)).toBe(90_000);
  });

  test('a rejected payload leaves the shipped bounds in place', async () => {
    const s = setup([{ graceMinMs: 1_000 }]);
    await s.port.sync();
    expect(s.port.walkingGraceMs(30_000)).toBe(30_000);
  });

  test('the kill switch reverts the bounds with everything else', async () => {
    const s = setup([{ graceMinMs: 60_000, killSwitch: true }]);
    const report = await s.port.sync();
    expect(report.source).toBe('remote');
    expect(report.killSwitch.applied).toBe(true);
    expect(report.effective).toEqual(SHIPPED_STRIDE_GATE);
    expect(s.port.walkingGraceMs(30_000)).toBe(30_000);
    expect(s.port.walkingGraceMs(300_000)).toBe(300_000);
  });
});
