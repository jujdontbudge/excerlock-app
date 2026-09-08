import { notificationKind } from './catalog';

/** The subset of expo-notifications' `NotificationBehavior` the app decides. */
export type ForegroundBehavior = {
  shouldShowBanner: boolean;
  shouldShowList: boolean;
  shouldPlaySound: boolean;
  shouldSetBadge: boolean;
};

const shown: ForegroundBehavior = { shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false };
const silent: ForegroundBehavior = { shouldShowBanner: false, shouldShowList: false, shouldPlaySound: false, shouldSetBadge: false };

/**
 * The foreground handler policy. The lease warning is presented as a banner even while the app is
 * open: the user is walking, not reading Home. The trial reminder is suppressed while the paywall
 * is open, because the paywall already says everything the reminder would. The shield tap-through
 * arriving in the foreground means the user is already inside ExcerLock, so it stays silent, and
 * so does anything that is not in the catalog.
 */
export function foregroundBehavior(identifier: string, context: { paywallOpen: boolean }): ForegroundBehavior {
  switch (notificationKind(identifier)) {
    case 'walkLeaseWarning':
      return shown;
    case 'trialReminder':
      return context.paywallOpen ? silent : shown;
    default:
      return silent;
  }
}

let paywallOpen = false;
/** Set by the paywall route while it is mounted; read by the foreground handler. */
export const paywallPresence = {
  open: () => {
    paywallOpen = true;
  },
  close: () => {
    paywallOpen = false;
  },
  isOpen: () => paywallOpen,
};
