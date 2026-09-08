import { Entitlement } from '../../domain/types';
import { entitlementStore } from '../../state/entitlementStore';
import { SubscriptionPort } from '../SubscriptionPort';

/**
 * The laws every SubscriptionPort obeys, fake or Adapty. The entitlement store is the one published
 * state: both implementations read it, write it only when the status really changes, and let the app
 * observe it through `subscribe`.
 */
export type SubscriptionSubject = {
  port: SubscriptionPort;
  /** Arrange how the next paywall presentation ends. */
  paywall(outcome: 'purchase' | 'cancel' | 'error'): void;
  /** Arrange what the next restore finds. */
  restoreFinds(outcome: 'purchase' | 'nothing'): void;
  identifiedIds(): readonly string[];
  dispose(): void;
};

const entitled = (status: Entitlement['status']) => status === 'trial' || status === 'active';
const seed = (entitlement: Entitlement) => entitlementStore.getState().patch({ entitlement });
const current = () => entitlementStore.getState().data.entitlement;

export function describeSubscriptionPort(make: () => Promise<SubscriptionSubject>) {
  describe('SubscriptionPort contract', () => {
    let subject: SubscriptionSubject;
    beforeEach(async () => {
      subject = await make();
      seed({ status: 'none', renewsAt: null });
    });
    afterEach(() => subject.dispose());

    test('the entitlement is the published one, with an offer the trial screens can render', () => {
      const entitlement = subject.port.entitlement();
      expect(entitlement).toMatchObject(current());
      expect(entitlement.offer.trialDays).toBeGreaterThan(0);
      expect(entitlement.offer.reminderDaysBefore).toBeGreaterThanOrEqual(1);
      expect(entitlement.offer.label).toEqual(expect.any(String));
    });

    test('a completed purchase publishes an entitled status to every subscriber', async () => {
      const seen: Entitlement[] = [];
      const stop = subject.port.subscribe((entitlement) => seen.push(entitlement));
      subject.paywall('purchase');

      const result = await subject.port.presentPaywall('onboarding', 'annual');
      expect(entitled(result.status)).toBe(true);
      expect(result).toMatchObject(current());
      expect(seen).toContainEqual(current());
      stop();
    });

    test('a cancelled purchase returns what the user already had and writes nothing', async () => {
      const written = jest.fn();
      const stop = entitlementStore.subscribe(written);
      subject.paywall('cancel');

      await expect(subject.port.presentPaywall('onboarding', 'annual')).resolves.toMatchObject({ status: 'none' });
      expect(written).not.toHaveBeenCalled();
      stop();
    });

    test('a failed purchase rejects and leaves the entitlement alone', async () => {
      subject.paywall('error');
      await expect(subject.port.presentPaywall('in_app', 'annual')).rejects.toThrow();
      expect(current().status).toBe('none');
    });

    test('a restore that finds a purchase entitles an unentitled user', async () => {
      subject.restoreFinds('purchase');
      const result = await subject.port.restore();
      expect(entitled(result.status)).toBe(true);
      expect(result).toMatchObject(current());
    });

    test('a restore that finds nothing never downgrades a live entitlement', async () => {
      seed({ status: 'trial', renewsAt: '2026-09-14T15:00:00.000Z' });
      const written = jest.fn();
      const stop = entitlementStore.subscribe(written);
      subject.restoreFinds('nothing');

      await expect(subject.port.restore()).resolves.toMatchObject({ status: 'trial' });
      expect(written).not.toHaveBeenCalled();
      stop();
    });

    test('identify attaches the id the rest of the spine uses', async () => {
      subject.port.identify('supabase-uid');
      for (let attempt = 0; attempt < 8; attempt += 1) await Promise.resolve();
      expect(subject.identifiedIds()).toContain('supabase-uid');
    });

    test('unsubscribing stops delivery', async () => {
      const seen: Entitlement[] = [];
      subject.port.subscribe((entitlement) => seen.push(entitlement))();
      subject.restoreFinds('purchase');
      await subject.port.restore();
      expect(seen).toEqual([]);
    });
  });
}
