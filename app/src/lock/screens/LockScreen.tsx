import { openSettings } from "expo-linking";
import { ScrollView, Text } from "react-native";

import { localWallClockNow } from "@/home";
import { Screen, useTheme } from "@/ui";

import { FullLockCard } from "../components/FullLockCard";
import { LockWindowsCard } from "../components/LockWindowsCard";
import { LockedAppsCard } from "../components/LockedAppsCard";
import { LockStatusCard } from "../components/LockStatusCard";
import { PermissionPanel } from "../components/PermissionPanel";
import {
  getLockController,
  type LockController,
} from "../controller/lockController";
import { useHomeAllowance } from "../controller/ledgerSource";
import { useLockSnapshot } from "../hooks/useLockSnapshot";
import { fullLockConfirmation } from "../model/fullLockCopy";
import { deriveLockStatus } from "../model/lockStatus";

export interface LockScreenProps {
  /** Injected by tests and by the Phase-3 composition root. */
  controller?: LockController;
  /** Injected by tests; iOS's own Settings app otherwise. */
  openSettings?: () => void;
  /** Local wall-clock milliseconds. */
  now?: () => number;
}

/**
 * The lock surface: Screen Time permission, the app group, what is shielded
 * right now, and Full Lock.
 *
 * It composes and formats only. Whether shields are up is the OS's answer,
 * relayed by the ScreenTime boundary; what they *should* be is
 * `@excerlock/ledger`'s; and this screen never sees the selection handle behind
 * the group it names.
 */
export function LockScreen({
  controller = getLockController(),
  openSettings: onOpenSettings = openSettings,
  now = localWallClockNow,
}: LockScreenProps = {}) {
  const { spacing, typography } = useTheme();
  const {
    authorization,
    selection,
    shield,
    lockWindows,
    fullLock,
    precedence,
    recurringWindows,
  } =
    useLockSnapshot(controller);
  const allowance = useHomeAllowance();

  const status = deriveLockStatus({
    shield,
    lockWindows,
    selection,
    precedence,
    atMs: now(),
  });

  return (
    <Screen testID="lock-screen" variant="night">
      <ScrollView
        contentContainerStyle={{
          gap: spacing.lg,
          paddingBottom: spacing.xxl * 2,
          paddingHorizontal: spacing.gutter,
          paddingTop: spacing.gutter,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text accessibilityRole="header" style={typography.screenTitle}>
          Locked apps
        </Text>

        <LockStatusCard model={status} />
        <PermissionPanel
          status={authorization}
          onRequest={() => void controller.requestAuthorization()}
          onOpenSettings={onOpenSettings}
        />
        <LockedAppsCard
          selection={selection}
          canPick={authorization === "approved"}
          onPick={() => void controller.pickApps()}
        />
        <LockWindowsCard
          windows={recurringWindows}
          onSave={(window) => controller.saveRecurringLockWindow(window)}
          onDelete={(id) => controller.deleteRecurringLockWindow(id)}
        />
        <FullLockCard
          on={fullLock}
          hasSelection={selection !== null}
          confirmation={fullLockConfirmation(allowance, !fullLock)}
          onToggle={() => controller.setFullLock(!fullLock)}
        />
      </ScrollView>
    </Screen>
  );
}
