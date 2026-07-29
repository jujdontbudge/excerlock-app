import type { ScreenTimeAuthorizationStatus } from "@/screentime";

/**
 * The permissions primer, in one place.
 *
 * PRD §3.15's onboarding FLOW has a `permissions-primer` step and this surface
 * says the same thing later in Settings/Manage, so the copy lives here and both
 * read it — `onboarding/screens/PermissionsPrimerScreen.tsx` still carries its
 * own literals and should adopt `PERMISSION_COPY.notDetermined` when that
 * scaffold is made real.
 */
export interface PermissionCopy {
  /** The health-panel dot's word (PRD §3.15, Settings permissions panel). */
  readonly statusLabel: string;
  readonly title: string;
  readonly body: string;
  /** `null` when this state needs nothing from the user. */
  readonly actionLabel: string | null;
}

export const PERMISSION_COPY: Readonly<
  Record<ScreenTimeAuthorizationStatus, PermissionCopy>
> = Object.freeze({
  notDetermined: Object.freeze({
    statusLabel: "Not set up",
    title: "Screen Time keeps your choices honest",
    body: "You'll choose which apps ExcerLock can pause. iOS keeps the list private — ExcerLock never learns which apps you picked.",
    actionLabel: "Allow Screen Time",
  }),
  approved: Object.freeze({
    statusLabel: "On",
    title: "Screen Time is on",
    body: "ExcerLock can pause the apps you choose, and iOS keeps the list to itself.",
    actionLabel: null,
  }),
  denied: Object.freeze({
    statusLabel: "Off",
    title: "Screen Time is off",
    body: "ExcerLock can't pause anything without it. Turn it back on in Settings › Screen Time, then come back here.",
    actionLabel: "Open Settings",
  }),
});
