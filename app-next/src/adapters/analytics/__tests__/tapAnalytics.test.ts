import type { AnalyticsPort } from '../../../ports/AnalyticsPort';
import { tapAnalytics } from '../tapAnalytics';

function recordingPort(): AnalyticsPort & { calls: unknown[][] } {
  const calls: unknown[][] = [];
  return {
    calls,
    track: (event, props) => calls.push(['track', event, props]),
    screen: (name) => calls.push(['screen', name]),
    identify: (id) => calls.push(['identify', id]),
    setPersonProperties: (props) => calls.push(['setPersonProperties', props]),
    reset: () => calls.push(['reset']),
  };
}

describe('tapAnalytics', () => {
  it('reports track, screen and identify to the tap before forwarding them unchanged', () => {
    const inner = recordingPort();
    const seen: unknown[][] = [];
    const port = tapAnalytics(inner, (kind, name, props) => seen.push([kind, name, props]));

    port.track('lock_applied', { rule: 'walk' });
    port.screen('Home');
    port.identify('user-1');

    expect(seen).toEqual([
      ['track', 'lock_applied', { rule: 'walk' }],
      ['screen', 'Home', undefined],
      ['identify', 'user-1', undefined],
    ]);
    expect(inner.calls).toEqual([
      ['track', 'lock_applied', { rule: 'walk' }],
      ['screen', 'Home'],
      ['identify', 'user-1'],
    ]);
  });

  it('passes person properties and reset straight through without tapping', () => {
    const inner = recordingPort();
    const tap = jest.fn();
    const port = tapAnalytics(inner, tap);

    port.setPersonProperties({ goal: 'walk' });
    port.reset();

    expect(tap).not.toHaveBeenCalled();
    expect(inner.calls).toEqual([['setPersonProperties', { goal: 'walk' }], ['reset']]);
  });
});
