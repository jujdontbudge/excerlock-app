import { NotificationsPort } from '../NotificationsPort';

type Subject = { port: NotificationsPort; dispose?: () => void };

/**
 * Laws every NotificationsPort keeps, fake or expo-backed: a synchronous status that agrees with
 * the last request, distinct ids for the two schedulable kinds, and a cancel that never throws
 * for an id it does not know.
 */
export function describeNotificationsPort(make: () => Promise<Subject>) {
  describe('NotificationsPort contract', () => {
    let subject: Subject;
    beforeEach(async () => {
      subject = await make();
    });
    afterEach(() => subject.dispose?.());

    it('answers status synchronously and agrees with the request result', async () => {
      expect(['notDetermined', 'granted', 'denied', 'restricted']).toContain(subject.port.status());
      const result = await subject.port.request();
      expect(subject.port.status()).toBe(result);
    });

    it('schedules the two kinds under distinct, non-empty ids', async () => {
      const trial = await subject.port.scheduleTrialReminder('2026-09-12T22:00:00.000Z', 2);
      const lease = await subject.port.scheduleWalkLeaseWarning('2026-09-07T15:14:30.000Z', 'handheld');
      expect(trial.length).toBeGreaterThan(0);
      expect(lease.length).toBeGreaterThan(0);
      expect(trial).not.toBe(lease);
    });

    it('cancels a scheduled id and tolerates an unknown one', async () => {
      const id = await subject.port.scheduleTrialReminder('2026-09-12T22:00:00.000Z', 2);
      await expect(subject.port.cancel(id)).resolves.toBeUndefined();
      await expect(subject.port.cancel(id)).resolves.toBeUndefined();
      await expect(subject.port.cancel('never-scheduled')).resolves.toBeUndefined();
    });

    it('exposes exactly the two schedulable kinds', () => {
      const schedulable = Object.keys(subject.port)
        .filter((method) => method.startsWith('schedule'))
        .sort();
      expect(schedulable).toEqual(['scheduleTrialReminder', 'scheduleWalkLeaseWarning']);
    });
  });
}
