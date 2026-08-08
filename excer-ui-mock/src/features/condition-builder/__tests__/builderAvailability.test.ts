import { conditionCatalog } from '@/content';
import { createDemoState, type DemoCondition } from '@/presentation';

import {
  getCatalogAvailability,
  getPlaceAvailability,
  hasBuilderAppleHealthAccess,
} from '../builderAvailability';

const state = createDemoState({ stage: 'home', showcase: true });

function catalog(id: string) {
  const entry = conditionCatalog.find((candidate) => candidate.id === id);
  if (!entry) throw new Error(`Missing catalog fixture ${id}`);
  return entry;
}

function existing(overrides: Partial<DemoCondition>): DemoCondition {
  return {
    ...state.conditions[2],
    ...overrides,
  };
}

describe('builder availability', () => {
  it('uses the Health-specific local outcome instead of aggregate panel health', () => {
    expect(hasBuilderAppleHealthAccess({ connected: true, permissionOutcome: 'allowed' })).toBe(true);
    expect(hasBuilderAppleHealthAccess({ connected: true, permissionOutcome: 'notAsked' })).toBe(true);
    expect(hasBuilderAppleHealthAccess({ connected: true, permissionOutcome: 'denied' })).toBe(false);
    expect(hasBuilderAppleHealthAccess({ connected: false, permissionOutcome: 'allowed' })).toBe(false);
  });

  it('blocks Event/Rate conflicts by source signal rather than catalog id', () => {
    const availability = getCatalogAvailability({
      appleHealthAvailable: true,
      candidate: catalog('walk-steps-event'),
      existingConditions: [existing({
        catalogId: 'walk-steps-rate',
        enabled: true,
        kind: 'rate',
        name: 'Morning steps',
      })],
      savedGyms: [],
    });

    expect(availability).toEqual({
      available: false,
      reason: 'Unavailable while Morning steps is active. Both would reward the same activity.',
    });
  });

  it('does not treat state conditions or disabled banking conditions as conflicts', () => {
    const stateAvailability = getCatalogAvailability({
      appleHealthAvailable: true,
      candidate: catalog('walk-state'),
      existingConditions: [existing({ catalogId: 'walk-steps-rate', kind: 'rate' })],
      savedGyms: [],
    });
    const disabledAvailability = getCatalogAvailability({
      appleHealthAvailable: true,
      candidate: catalog('walk-steps-event'),
      existingConditions: [existing({
        catalogId: 'walk-steps-rate',
        enabled: false,
        kind: 'rate',
      })],
      savedGyms: [],
    });

    expect(stateAvailability.available).toBe(true);
    expect(disabledAvailability.available).toBe(true);
  });

  it('blocks Health-backed rows when the local Apple Health connection is unavailable', () => {
    expect(getCatalogAvailability({
      appleHealthAvailable: false,
      candidate: catalog('run-distance-event'),
      existingConditions: [],
      savedGyms: [],
    })).toEqual({
      available: false,
      reason: 'Connect the Apple Health demo state to configure this condition.',
    });
  });

  it('allows the same gym condition at another saved gym while blocking the duplicate place', () => {
    const gymCondition = existing({
      catalogId: 'gym-arrive',
      gymId: 'harbor-strength',
      kind: 'event',
      name: 'Harbor check-in',
    });

    expect(getPlaceAvailability({
      candidate: catalog('gym-arrive'),
      existingConditions: [gymCondition],
      gymId: 'harbor-strength',
    }).available).toBe(false);
    expect(getPlaceAvailability({
      candidate: catalog('gym-arrive'),
      existingConditions: [gymCondition],
      gymId: 'northside',
    }).available).toBe(true);
  });

  it('keeps a gym row reachable so the place step can offer its local Add gym recovery', () => {
    expect(getCatalogAvailability({
      appleHealthAvailable: true,
      candidate: catalog('gym-arrive'),
      existingConditions: [],
      savedGyms: [],
    }).available).toBe(true);
  });
});
