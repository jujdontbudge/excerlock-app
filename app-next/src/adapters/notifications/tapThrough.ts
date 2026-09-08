import { requestHomeWalkingSheet } from '../../features/home/homeSheetRequest';
import { Unsubscribe } from '../../ports/models';
import { Runtime } from '../../runtime/Runtime';
import { ruleDaysStore } from '../../state/ruleDaysStore';
import { NotificationResponse, NotificationResponseSource } from './ExpoNotificationsAdapter';
import { sessionIsLive } from './leaseWarning';
import { notificationLanding, NotificationRoute } from './landing';

/**
 * Turns a notification tap into navigation through the landing table. The response that
 * launched the app is handled first, then every later one; a tap on an id outside the catalog is
 * ignored. A lease-warning tap also asks Home for the walking sheet when the session is still
 * live. Every handled tap records `notification_opened`.
 */
export function startNotificationTapThrough(
  runtime: Runtime,
  source: NotificationResponseSource,
  navigate: (route: NotificationRoute) => void,
): Unsubscribe {
  const handle = ({ identifier }: NotificationResponse) => {
    const landing = notificationLanding(identifier);
    if (!landing) return;
    if (landing.kind === 'walkLeaseWarning') {
      const session = ruleDaysStore.getState().data.walkingSession;
      if (sessionIsLive(session)) requestHomeWalkingSheet(session.ruleId);
    }
    runtime.analytics.track('notification_opened', { kind: landing.kind });
    navigate(landing.route);
    source.clear();
  };
  const launched = source.last();
  if (launched) handle(launched);
  return source.subscribe(handle);
}
