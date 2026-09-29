import type { NotificationResponse, NotificationResponsesPort } from '../../../ports/NotificationResponsesPort';
import type { NotificationLanding } from '../../../notifications/notificationPlan';

export type FakeNotificationResponses = NotificationResponsesPort & {
  deliver(destination: 'home' | 'unlock'): void;
  reset(): void;
};

export function NotificationResponsesFake(
  update: (snapshot: { delivered: ('home' | 'unlock')[]; handled: number }) => void,
): FakeNotificationResponses {
  let count = 0;
  let latest: NotificationResponse | null = null;
  let delivered: ('home' | 'unlock')[] = [];
  let handled = 0;
  const listeners = new Set<(response: NotificationResponse) => void>();
  return {
    last: async () => latest,
    subscribe(receive) {
      listeners.add(receive);
      return () => listeners.delete(receive);
    },
    clear: async () => {
      latest = null;
      handled += 1;
      update({ delivered, handled });
    },
    deliver(destination) {
      const url: NotificationLanding = destination === 'home' ? 'excerlock://home' : 'excerlock://unlock/propped';
      delivered = [...delivered, destination];
      latest = {
        id: `fake-response-${++count}`,
        receivedAt: Date.now(),
        action: 'default',
        url,
      };
      update({ delivered, handled });
      listeners.forEach((receive) => receive(latest!));
    },
    reset() {
      latest = null;
      delivered = [];
      handled = 0;
      update({ delivered, handled });
    },
  };
}
