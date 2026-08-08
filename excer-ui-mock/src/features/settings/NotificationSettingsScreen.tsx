import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import { notificationSettingsCopy, type NotificationEntryKind } from '@/content';
import {
  AccessibleModal,
  AccessibleModalTitle,
  GradientScreen,
  PillButton,
  PillowCard,
  SettingsRow,
  SwitchRow,
  colors,
  space,
  type,
} from '@/design-system';

import { PrototypeLabel, SettingsHeader, settingsFeatureStyles as s } from './components';

export type NotificationToggleValues = Record<NotificationEntryKind, boolean>;

export interface NotificationSettingsScreenProps {
  nudgeTime: string;
  onBack: () => void;
  onOpenNudgeTime: () => void;
  onPermissionPreviewed: (outcome: 'allowed' | 'denied') => void;
  onToggle: (kind: NotificationEntryKind, enabled: boolean) => void;
  permissionPreviewed: boolean;
  values: NotificationToggleValues;
}

export function NotificationSettingsScreen({
  nudgeTime,
  onBack,
  onOpenNudgeTime,
  onPermissionPreviewed,
  onToggle,
  permissionPreviewed,
  values,
}: NotificationSettingsScreenProps) {
  const [pendingKind, setPendingKind] = useState<NotificationEntryKind | null>(null);
  const [primerPhase, setPrimerPhase] = useState<'benefit' | 'permission' | null>(null);

  const closePrimer = () => {
    setPendingKind(null);
    setPrimerPhase(null);
  };

  const requestToggle = (kind: NotificationEntryKind, enabled: boolean) => {
    if (!enabled || permissionPreviewed) {
      onToggle(kind, enabled);
      return;
    }
    setPendingKind(kind);
    setPrimerPhase('benefit');
  };

  return (
    <>
      <GradientScreen variant="detail">
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <SettingsHeader onBack={onBack} title={notificationSettingsCopy.title} />
          <Text style={s.body}>{notificationSettingsCopy.body}</Text>
          <PrototypeLabel>LOCAL NOTIFICATION AND PERMISSION PREVIEW</PrototypeLabel>
          <PillowCard padding="none" variant="grouped">
            {notificationSettingsCopy.toggles.map((toggle, index) => (
              <View key={toggle.id}>
                {index > 0 ? <View style={s.divider} /> : null}
                <SwitchRow
                  onValueChange={(enabled) => requestToggle(toggle.id, enabled)}
                  subtitle={toggle.subtitle}
                  title={toggle.label}
                  value={values[toggle.id]}
                />
              </View>
            ))}
            {values.afternoonNudge ? (
              <>
                <View style={s.divider} />
                <SettingsRow onPress={onOpenNudgeTime} subtitle="Prototype time wheel" title={notificationSettingsCopy.nudgeTime.title} value={nudgeTime} />
              </>
            ) : null}
          </PillowCard>
          <PillowCard><Text style={s.title}>{notificationSettingsCopy.quietHours}</Text><Text style={s.body}>{notificationSettingsCopy.prototypeNote}</Text></PillowCard>
          <Text style={s.note}>The first on-toggle opens a benefit primer and simulated permission preview. No OS prompt is called here.</Text>
        </ScrollView>
      </GradientScreen>

      <AccessibleModal
        accessibilityTitle={primerPhase === 'permission' ? 'Notification permission preview' : notificationSettingsCopy.firstTogglePrimer.title}
        animationType="fade"
        onRequestClose={closePrimer}
        style={styles.backdrop}
        visible={primerPhase !== null}
      >
        <PillowCard style={styles.modalCard} variant="light">
          <Text style={styles.eyebrow}>SIMULATED SYSTEM PERMISSION · NO OS REQUEST</Text>
          <AccessibleModalTitle style={styles.title}>
            {primerPhase === 'permission'
              ? 'Allow ExcerLock notifications in this demo?'
              : notificationSettingsCopy.firstTogglePrimer.title}
          </AccessibleModalTitle>
          <Text style={styles.body}>
            {primerPhase === 'permission'
              ? 'Allow enables only the selected local switch. Nothing is scheduled or delivered.'
              : notificationSettingsCopy.firstTogglePrimer.body}
          </Text>
          {primerPhase === 'permission' ? (
            <>
              <PillButton
                fullWidth
                label="Allow in demo"
                onPress={() => {
                  if (pendingKind) onToggle(pendingKind, true);
                  onPermissionPreviewed('allowed');
                  closePrimer();
                }}
                variant="dark"
              />
              <PillButton
                fullWidth
                label="Not now"
                onPress={() => {
                  onPermissionPreviewed('denied');
                  closePrimer();
                }}
                variant="text"
              />
            </>
          ) : (
            <>
              <PillButton fullWidth label={notificationSettingsCopy.firstTogglePrimer.primary} onPress={() => setPrimerPhase('permission')} variant="dark" />
              <PillButton fullWidth label={notificationSettingsCopy.firstTogglePrimer.secondary} onPress={closePrimer} variant="text" />
            </>
          )}
        </PillowCard>
      </AccessibleModal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: colors.surface.scrim, flex: 1, justifyContent: 'center', padding: space[4] },
  body: { ...type.body, color: colors.text.ink, opacity: 0.72 },
  eyebrow: { ...type.micro, color: colors.brand.burnt },
  modalCard: { gap: space[4] },
  title: { ...type.screenTitle, color: colors.text.ink },
});
