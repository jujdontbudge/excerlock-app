import { resolveDayDetailKind } from '../resolveDayDetailKind';

describe('resolveDayDetailKind', () => {
  it('resolves event, rate, and state details from the canonical heat-map date', () => {
    expect(resolveDayDetailKind('2026-08-06')).toBe('event');
    expect(resolveDayDetailKind('2026-08-07')).toBe('rate');
    expect(resolveDayDetailKind('2026-08-05')).toBe('state');
  });

  it('resolves neutral and future fixture states by date', () => {
    expect(resolveDayDetailKind('2026-07-24')).toBe('missed');
    expect(resolveDayDetailKind('2026-08-02')).toBe('rest');
    expect(resolveDayDetailKind('2026-08-09')).toBe('blank');
  });

  it('allows a valid explicit kind as a deterministic debug override', () => {
    expect(resolveDayDetailKind('2026-08-06', 'missed')).toBe('missed');
  });

  it('ignores invalid overrides and treats unknown dates as blank', () => {
    expect(resolveDayDetailKind('2026-08-07', 'not-a-kind')).toBe('rate');
    expect(resolveDayDetailKind('2099-01-01')).toBe('blank');
  });
});
