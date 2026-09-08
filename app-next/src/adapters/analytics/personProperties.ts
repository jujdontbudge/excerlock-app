import { AnalyticsPort } from '../../ports/AnalyticsPort';
import { Unsubscribe } from '../../ports/models';
import { profileStore } from '../../state/profileStore';

/**
 * The four onboarding answers that become person properties (O06–O09). They are single choices
 * from closed option lists, and this is the stated purpose the audit asked for: nothing else in
 * the app reads them.
 */
export const PERSON_PROPERTY_KEYS = ['ageBand', 'occupation', 'improveFirst', 'mainReason'] as const;

export function personPropertiesOf(profile: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    PERSON_PROPERTY_KEYS.flatMap((key) => {
      const value = profile[key];
      return typeof value === 'string' && value.length > 0 ? [[key, value]] : [];
    }),
  );
}

/**
 * Follows the profile and pushes the four answers whenever they change. `commitPlan` writes them
 * at the end of the questionnaire; on a later launch the store's own rehydration is the change,
 * so an already-onboarded person keeps their person record without a second code path.
 *
 * There is deliberately no push on mount: the profile's defaults are not answers, and sending
 * them would record an age band nobody chose.
 */
export function startPersonProperties(analytics: AnalyticsPort): Unsubscribe {
  let sent = '';
  return profileStore.subscribe(() => {
    const properties = personPropertiesOf(profileStore.getState().data);
    const signature = JSON.stringify(properties);
    if (signature === sent || Object.keys(properties).length === 0) return;
    sent = signature;
    analytics.setPersonProperties(properties);
  });
}
