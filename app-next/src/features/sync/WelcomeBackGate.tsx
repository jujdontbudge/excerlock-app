import { useState } from 'react';
import { Modal, View, StyleSheet } from 'react-native';
import { syncLog as useSyncLog } from '../../adapters/sync/syncLog';
import { RestoreRecord } from '../../adapters/sync/syncLog';
import { EmptyState, Label, PrimaryButton } from '../../design-system';
import { tokens as t } from '../../design-system/tokens';
import { syncCopy as c } from '../../content/sync';

/** Whether a restore is worth telling the user about at all. */
export function announces(record: RestoreRecord | null): boolean {
  if (!record?.localWasEmpty) return false;
  const { rules, ruleDays, earnedUnlocks, history, usageDays, profile } = record.summary;
  return rules + ruleDays + earnedUnlocks + history + usageDays > 0 || profile;
}

/**
 * The one thing sync says out loud.
 *
 * Signing in on a new phone pulls an account's conditions and history onto a device that had none,
 * and without a word the user would find their app locked by rules they never made here. It shows
 * only for that case — a device with its own rules merged silently, which is the point of the merge
 * — and it names the one thing that did not come back: the app selection is a Screen Time handle
 * that never leaves the device it was made on.
 */
export function WelcomeBackGate() {
  const record = useSyncLog((state) => state.lastRestore);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const visible = announces(record) && record?.at !== dismissed;
  if (!visible || !record) return null;
  return (
    <Modal transparent animationType="fade" visible onRequestClose={() => setDismissed(record.at)}>
      <View style={styles.scrim}>
        <View style={styles.card}>
          <EmptyState icon="check" title={c.welcomeTitle} body={c.welcomeBody(record.summary)} />
          <Label>{c.welcomeApps}</Label>
          <PrimaryButton label={c.welcomeAction} onPress={() => setDismissed(record.at)} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: 'center',
    padding: t.space.xl,
    backgroundColor: t.surface.scrim,
  },
  card: {
    gap: t.space.lg,
    padding: t.space.xl,
    borderRadius: t.radius.card,
    backgroundColor: t.surface.card,
  },
});
