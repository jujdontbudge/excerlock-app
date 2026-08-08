import type { ComponentRef, RefObject } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import {
  assetRegistry,
  settingsPermissionPanels,
  settingsRootCopy,
  settingsRootSections,
} from '@/content';
import {
  GradientScreen,
  IconChip,
  PillowCard,
  PressableScale,
  SettingsRow,
  colors,
  space,
  type,
} from '@/design-system';

import { SectionLabel, SettingsHeader, settingsFeatureStyles as s } from './components';

export interface SettingsScreenProps {
  accountSignedIn?: boolean;
  onFooterTap: () => void;
  onOpenPermissions: () => void;
  onOpenRow: (rowId: string, route: string) => void;
  permissionHealth?: 'attention' | 'healthy';
  scrollRef?: RefObject<SettingsScrollHandle | null>;
  summaryOverrides?: Partial<Record<'subscription' | 'notifications' | 'general' | 'connections', string>>;
}

export type SettingsScrollHandle = ComponentRef<typeof ScrollView>;

const rowGlyph = {
  account: assetRegistry.glyphs['icon-account'],
  subscription: assetRegistry.glyphs['icon-tab-alarm'],
  notifications: assetRegistry.glyphs['icon-notifications'],
  general: assetRegistry.glyphs['icon-pencil'],
  connections: assetRegistry.glyphs['icon-connections'],
  data: assetRegistry.glyphs['icon-share'],
  help: assetRegistry.glyphs['icon-info'],
  contact: assetRegistry.glyphs['icon-account'],
  bug: assetRegistry.glyphs['icon-camera'],
  idea: assetRegistry.glyphs['icon-sparkle'],
  diagnostics: assetRegistry.glyphs['icon-health'],
  about: assetRegistry.glyphs['icon-sparkle'],
} as const;

export function SettingsScreen({
  accountSignedIn = true,
  onFooterTap,
  onOpenPermissions,
  onOpenRow,
  permissionHealth = 'attention',
  scrollRef,
  summaryOverrides = {},
}: SettingsScreenProps) {
  const panel = settingsPermissionPanels[permissionHealth];
  return (
    <GradientScreen edges={['top', 'left', 'right']} variant="content">
      <ScrollView ref={scrollRef} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <SettingsHeader title={settingsRootCopy.title} />
        <PressableScale accessibilityLabel={`${panel.title}, ${panel.status}. ${panel.action}`} accessibilityRole="button" onPress={onOpenPermissions} pressedScale={0.98}>
          <PillowCard style={styles.permissionCard} variant="elevated">
            <View style={s.row}>
              <IconChip size="lg" source={assetRegistry.glyphs['icon-health']} variant={permissionHealth === 'healthy' ? 'success' : 'energy'} />
              <View style={s.rowCopy}>
                <Text style={s.title}>{panel.title}</Text>
                <Text style={styles.permissionStatus}>{panel.status}</Text>
              </View>
            </View>
            <Text style={s.body}>{panel.body}</Text>
            <Text style={styles.reviewLabel}>{panel.action} ›</Text>
          </PillowCard>
        </PressableScale>

        {settingsRootSections.map((section) => (
          <View key={section.id} style={s.cardGap}>
            <SectionLabel>{section.title}</SectionLabel>
            <PillowCard padding="none" variant="grouped">
              {section.rows.map((row, index) => (
                <View key={row.id}>
                  {index > 0 ? <View style={s.divider} /> : null}
                  <SettingsRow
                    leading={<IconChip size="sm" source={rowGlyph[row.id]} variant="dark" />}
                    onPress={() => onOpenRow(row.id, row.route)}
                    subtitle={row.id === 'account' && !accountSignedIn
                      ? settingsRootCopy.signedOutAccountSubtitle
                      : row.id in summaryOverrides
                        ? summaryOverrides[row.id as keyof typeof summaryOverrides]
                        : row.subtitle}
                    title={row.label}
                  />
                </View>
              ))}
            </PillowCard>
          </View>
        ))}
        <PressableScale accessibilityLabel="Prototype version. Tap for local debug entry" accessibilityRole="button" onPress={onFooterTap}>
          <View style={styles.footer}><Text style={styles.footerText}>{settingsRootCopy.footer}</Text></View>
        </PressableScale>
      </ScrollView>
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  footer: { alignItems: 'center', minHeight: 52, justifyContent: 'center' },
  footerText: { ...type.caption, color: colors.text.tertiary },
  permissionCard: { gap: space[3] },
  permissionStatus: { ...type.label, color: colors.brand.signatureAmber, marginTop: space[1] },
  reviewLabel: { ...type.label, color: colors.text.primary },
});
