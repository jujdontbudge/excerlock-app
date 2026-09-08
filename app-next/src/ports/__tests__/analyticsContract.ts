import { AnalyticsPort } from '../AnalyticsPort';

/**
 * What every `AnalyticsPort` owes its callers, whatever is behind it. A screen calls these five
 * methods without knowing whether a vendor exists, whether one is configured, or whether the
 * person opted out, so none of them may throw, block, or hand back something to await.
 */
export function describeAnalyticsPort(build: () => AnalyticsPort): void {
  describe('AnalyticsPort contract', () => {
    let analytics: AnalyticsPort;
    beforeEach(() => {
      analytics = build();
    });

    test('accepts an event with and without properties', () => {
      expect(() => analytics.track('shields_applied')).not.toThrow();
      expect(() => analytics.track('condition_created', { activity: 'walking' })).not.toThrow();
    });

    test('accepts a screen, an identity, person properties and a reset', () => {
      expect(() => analytics.screen('O01')).not.toThrow();
      expect(() => analytics.identify('user-1')).not.toThrow();
      expect(() => analytics.setPersonProperties({ ageBand: '25–34' })).not.toThrow();
      expect(() => analytics.reset()).not.toThrow();
    });

    test('an event nobody registered never throws at the call site', () => {
      expect(() => analytics.track('not_a_registered_event', { anything: 1 })).not.toThrow();
    });

    test('a screen name outside the flow never throws at the call site', () => {
      expect(() => analytics.screen('Saved gyms')).not.toThrow();
    });

    test('every method returns void, so no call site can await analytics', () => {
      expect(analytics.track('shields_applied')).toBeUndefined();
      expect(analytics.screen('O01')).toBeUndefined();
      expect(analytics.identify('user-1')).toBeUndefined();
      expect(analytics.setPersonProperties({ ageBand: '25–34' })).toBeUndefined();
      expect(analytics.reset()).toBeUndefined();
    });
  });
}
