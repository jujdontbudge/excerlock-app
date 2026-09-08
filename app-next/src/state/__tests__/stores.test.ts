import { stores } from '../stores';
import { profileStore } from '../profileStore';
import { rulesStore } from '../rulesStore';
import { entitlementStore } from '../entitlementStore';
import { permissionsStore } from '../permissionsStore';
import { onboardingStore } from '../onboardingStore';
import { reviewStore } from '../reviewStore';
import { rule } from '../../domain/__tests__/fixtures';
test('all nine stores reject malformed persisted fields and accept valid product facts', async () => {
  expect(stores).toHaveLength(9);
  for (const store of stores) {
    await store.persist.rehydrate();
    const initial = store.getState().data;
    store.getState().patch(Object.fromEntries(Object.keys(initial).map((k) => [k, Symbol('bad')])) as never);
    expect(store.getState().data).toEqual(initial);
  }
  profileStore.getState().patch({ name: 'Alex', estimatedDailyMinutes: 180 });
  expect(profileStore.getState().data.name).toBe('Alex');
  rulesStore.getState().patch({ rules: [rule] });
  expect(rulesStore.getState().data.rules).toEqual([rule]);
  rulesStore.getState().patch({ rules: [{} as never] });
  expect(rulesStore.getState().data.rules).toEqual([rule]);
  entitlementStore.getState().patch({ entitlement: { status: 'trial', renewsAt: '2026-09-14T00:00:00Z' } });
  expect(entitlementStore.getState().data.entitlement.status).toBe('trial');
  permissionsStore.getState().patch({ motion: 'granted' });
  expect(permissionsStore.getState().data.motion).toBe('granted');
  permissionsStore.getState().patch({ location: 'restricted' });
  expect(permissionsStore.getState().data.location).toBe('restricted');
  onboardingStore.getState().patch({ step: 'W3', answers: { activity: 'walking', name: 'Alex' } });
  expect(onboardingStore.getState().data.step).toBe('W3');
  reviewStore.getState().patch({ installedAt: '2026-09-01T00:00:00.000Z', promptCount: 2, manualRateTapped: true });
  expect(reviewStore.getState().data).toEqual({ installedAt: '2026-09-01T00:00:00.000Z', promptCount: 2, manualRateTapped: true });
  reviewStore.getState().patch({ promptCount: 7, installedAt: 'not a date' });
  expect(reviewStore.getState().data.promptCount).toBe(2);
  expect(reviewStore.getState().data.installedAt).toBe('2026-09-01T00:00:00.000Z');
});
