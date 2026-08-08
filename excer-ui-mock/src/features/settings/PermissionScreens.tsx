import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import {
  aboutPermissionsSections,
  assetRegistry,
  permissionDetails,
  permissionHealthFixtures,
  permissionsScreenCopy,
  type PermissionDetailId,
} from '@/content';
import {
  AccessibleModal,
  AccessibleModalTitle,
  GradientScreen,
  IconChip,
  PillButton,
  PillowCard,
  SettingsRow,
  colors,
  space,
  type,
} from '@/design-system';

import { PrototypeLabel, SettingsHeader, settingsFeatureStyles as s } from './components';

export interface PermissionsScreenProps {
  onBack: () => void;
  onOpenAbout: () => void;
  onOpenPermission: (permission: PermissionDetailId) => void;
  statuses: Record<PermissionDetailId, PermissionPreviewStatus>;
}

export type PermissionPreviewStatus = 'healthy' | 'attention' | 'notAsked';

export function PermissionsScreen({ onBack, onOpenAbout, onOpenPermission, statuses }: PermissionsScreenProps) {
  return (
    <GradientScreen variant="detail">
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <SettingsHeader onBack={onBack} title={permissionsScreenCopy.title} />
        <PillowCard padding="none" variant="grouped">
          <SettingsRow onPress={onOpenAbout} subtitle={permissionsScreenCopy.aboutRowSubtitle} title="About permissions" />
        </PillowCard>
        <PillowCard padding="none" variant="grouped">
          {(Object.entries(permissionHealthFixtures) as [PermissionDetailId, (typeof permissionHealthFixtures)[PermissionDetailId]][]).map(([id, permission], index) => {
            const previewStatus = statuses[id];
            const attention = previewStatus === 'attention';
            const status = previewStatus === 'healthy'
              ? permission.healthyStatus
              : previewStatus === 'notAsked' && id !== 'screenTime'
                ? 'Not asked · optional'
                : 'Needs attention';
            return (
              <View key={id}>
                {index > 0 ? <View style={s.divider} /> : null}
                <SettingsRow
                  leading={<View style={[stylesStatus.dot, { backgroundColor: attention ? colors.semantic.attention : colors.semantic.success }]} />}
                  onPress={() => onOpenPermission(id)}
                  title={permission.label}
                  value={status}
                />
              </View>
            );
          })}
        </PillowCard>
        <Text style={s.note}>No permission or device setting is read on this screen.</Text>
      </ScrollView>
    </GradientScreen>
  );
}

export interface PermissionDetailScreenProps {
  id: PermissionDetailId;
  onAboutData: () => void;
  onBack: () => void;
  onMarkNotAsked: () => void;
  onOpenSettingsPreview: () => void;
  onRetry: () => void;
  status: 'healthy' | 'attention' | 'notAsked';
}

export function PermissionDetailScreen({ id, onAboutData, onBack, onMarkNotAsked, onOpenSettingsPreview, onRetry, status }: PermissionDetailScreenProps) {
  const [settingsPreviewVisible, setSettingsPreviewVisible] = useState(false);
  const detail = permissionDetails[id];
  const source = id === 'location'
    ? assetRegistry.glyphs['icon-location']
    : id === 'notifications'
      ? assetRegistry.glyphs['icon-notifications']
      : assetRegistry.glyphs['icon-health'];
  return (
    <>
      <GradientScreen variant="detail">
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <SettingsHeader onBack={onBack} title={detail.permission} />
        <View style={s.center}>
          <IconChip size="hero" source={source} variant={status === 'healthy' ? 'success' : 'energy'} />
          <Text style={s.sectionTitle}>{detail.title}</Text>
          <Text style={s.body}>{detail.body}</Text>
        </View>
        <PillowCard>
          <Text style={s.label}>WITHOUT IT</Text>
          <Text style={s.body}>{detail.without}</Text>
        </PillowCard>
        <PrototypeLabel>SYSTEM SETTINGS PROTOTYPE PREVIEW</PrototypeLabel>
        {status === 'healthy' ? (
          <PillButton fullWidth label={permissionsScreenCopy.healthyAction} onPress={onMarkNotAsked} variant="secondary" />
        ) : (
          <>
            <PillButton fullWidth label="Open iOS Settings preview" onPress={() => setSettingsPreviewVisible(true)} variant="screen" />
            <PillButton fullWidth label="Try demo diagnostic again" onPress={onRetry} variant="secondary" />
          </>
        )}
        <PillButton fullWidth label="About sample data use" onPress={onAboutData} variant="text" />
        <Text style={s.note}>{permissionsScreenCopy.settingsDisclosure}</Text>
        </ScrollView>
      </GradientScreen>

      <AccessibleModal
        accessibilityTitle="iOS Settings preview"
        animationType="slide"
        onRequestClose={() => setSettingsPreviewVisible(false)}
        style={styles.backdrop}
        visible={settingsPreviewVisible}
      >
        <PillowCard style={styles.modalCard} variant="light">
          <Text style={styles.eyebrow}>SIMULATED IOS SETTINGS · NO SYSTEM PAGE</Text>
          <AccessibleModalTitle style={styles.modalTitle}>ExcerLock · {detail.permission}</AccessibleModalTitle>
          <Text style={styles.modalBody}>This sheet previews the handoff only. Choose Allow in demo to update the local permission-health fixture.</Text>
          <PillowCard padding="none" variant="grouped">
            <SettingsRow showChevron={false} title={detail.permission} value="Needs attention" />
          </PillowCard>
          <PillButton
            fullWidth
            label="Allow in demo"
            onPress={() => {
              setSettingsPreviewVisible(false);
              onOpenSettingsPreview();
            }}
            variant="dark"
          />
          <PillButton fullWidth label="Cancel" onPress={() => setSettingsPreviewVisible(false)} variant="text" />
        </PillowCard>
      </AccessibleModal>
    </>
  );
}

export interface AboutPermissionsScreenProps { onBack: () => void }

export function AboutPermissionsScreen({ onBack }: AboutPermissionsScreenProps) {
  return (
    <GradientScreen variant="detail">
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <SettingsHeader onBack={onBack} title="About permissions" />
        {aboutPermissionsSections.map((section) => (
          <PillowCard key={section.title}><Text style={s.title}>{section.title}</Text><Text style={s.body}>{section.body}</Text></PillowCard>
        ))}
      </ScrollView>
    </GradientScreen>
  );
}

const stylesStatus = {
  dot: { borderRadius: 5, height: 10, width: 10 },
};

const styles = StyleSheet.create({
  backdrop: { backgroundColor: colors.surface.scrim, flex: 1, justifyContent: 'flex-end', padding: space[3] },
  eyebrow: { ...type.micro, color: colors.brand.burnt },
  modalBody: { ...type.body, color: colors.text.ink, opacity: 0.72 },
  modalCard: { gap: space[4] },
  modalTitle: { ...type.screenTitle, color: colors.text.ink },
});
