import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import {
  aboutPermissionsSections,
  permissionDetails,
  permissionHealthFixtures,
  permissionsScreenCopy,
  assetRegistry,
  type PermissionDetailId,
} from '@/content';
import {
  AccessibleModal,
  DottedSeparator,
  FullScreenModalPage,
  GradientScreen,
  IconChip,
  PillButton,
  PillowCard,
  SettingsRow,
  VectorIcon,
  colors,
  iconSize,
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
                {index > 0 ? <DottedSeparator /> : null}
                <SettingsRow
                  leading={(
                    <View style={styles.permissionRowIcon}>
                      <VectorIcon source={permissionGlyph(id)} />
                    </View>
                  )}
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
  const source = id === 'screenTime'
    ? assetRegistry.heroes['permission-screen-time']
    : id === 'location'
      ? assetRegistry.heroes['permission-location']
      : id === 'notifications'
        ? assetRegistry.glyphs['icon-notifications']
        : assetRegistry.heroes['permission-health-motion'];
  return (
    <>
      <GradientScreen variant="detail">
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <SettingsHeader onBack={onBack} title={detail.permission} />
        <View style={s.center}>
          {id === 'notifications' ? (
            <IconChip size="hero" source={source} variant={status === 'healthy' ? 'success' : 'energy'} />
          ) : (
            <VectorIcon accessibilityLabel={`${detail.permission} illustration`} source={source} style={styles.permissionHero} />
          )}
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
        accessibilityTitle={`ExcerLock · ${detail.permission}`}
        contentContainerStyle={styles.modalPage}
        onRequestClose={() => setSettingsPreviewVisible(false)}
        scrollEnabled={false}
        style={styles.backdrop}
        visible={settingsPreviewVisible}
      >
        <PillowCard style={[styles.modalCard, styles.modalCardFull]} variant="light">
          <FullScreenModalPage
            footer={(
              <>
                <PillButton
                  fullWidth
                  label="Allow in demo"
                  onPress={() => {
                    setSettingsPreviewVisible(false);
                    onOpenSettingsPreview();
                  }}
                  variant="screen"
                />
                <PillButton fullWidth label="Cancel" onPress={() => setSettingsPreviewVisible(false)} variant="text" />
              </>
            )}
          >
          <PillowCard padding="none" variant="grouped">
            <SettingsRow showChevron={false} title={detail.permission} value="Needs attention" />
          </PillowCard>
          </FullScreenModalPage>
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

function permissionGlyph(id: PermissionDetailId) {
  if (id === 'screenTime') return assetRegistry.glyphs['icon-padlock-chip'];
  if (id === 'location') return assetRegistry.glyphs['icon-location'];
  if (id === 'notifications') return assetRegistry.glyphs['icon-notifications'];
  return assetRegistry.glyphs['icon-health'];
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  eyebrow: { ...type.micro, color: colors.brand.burnt },
  modalCard: { gap: space[4] },
  modalCardFull: { flex: 1, paddingBottom: 0, paddingTop: 0 },
  modalPage: { flex: 1 },
  permissionHero: { height: 156, width: 156 },
  permissionRowIcon: { height: iconSize.standard, width: iconSize.standard },
});
