import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale, colors, space, type } from '@/design-system';

export function SettingsHeader({ light = false, onBack, title }: { light?: boolean; onBack?: () => void; title: string }) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <PressableScale accessibilityLabel="Back" accessibilityRole="button" onPress={onBack}>
          <View style={styles.headerAction}><Text style={[styles.back, light && styles.ink]}>‹</Text></View>
        </PressableScale>
      ) : <View style={styles.headerAction} />}
      <Text numberOfLines={1} style={[styles.headerTitle, light && styles.ink]}>{title}</Text>
      <View style={styles.headerAction} />
    </View>
  );
}

export function SectionLabel({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return <Text style={[styles.sectionLabel, light && styles.inkSecondary]}>{children}</Text>;
}

export function PrototypeLabel({ children = 'PROTOTYPE PREVIEW', light = false }: { children?: ReactNode; light?: boolean }) {
  return <Text style={[styles.prototype, light && styles.burnt]}>{children}</Text>;
}

export const settingsFeatureStyles = StyleSheet.create({
  body: { ...type.body, color: colors.text.secondary },
  cardGap: { gap: space[3] },
  center: { alignItems: 'center', gap: space[3], paddingVertical: space[5] },
  content: { gap: space[4], paddingBottom: space[16] },
  divider: { backgroundColor: colors.surface.divider, height: StyleSheet.hairlineWidth },
  label: { ...type.label, color: colors.text.secondary },
  note: { ...type.caption, color: colors.text.tertiary },
  row: { alignItems: 'center', flexDirection: 'row', gap: space[3], justifyContent: 'space-between' },
  rowCopy: { flex: 1, minWidth: 0 },
  sectionTitle: { ...type.sectionTitle, color: colors.text.primary },
  title: { ...type.cardTitle, color: colors.text.primary },
});

const styles = StyleSheet.create({
  back: { color: colors.text.primary, fontSize: 34, fontWeight: '300', lineHeight: 38 },
  header: { alignItems: 'center', flexDirection: 'row', minHeight: 56 },
  headerAction: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  headerTitle: { ...type.screenTitle, color: colors.text.primary, flex: 1, textAlign: 'center' },
  ink: { color: colors.text.ink },
  inkSecondary: { color: colors.text.ink, opacity: 0.68 },
  burnt: { color: colors.brand.burnt },
  prototype: { ...type.micro, color: colors.brand.signatureAmber },
  sectionLabel: { ...type.micro, color: colors.text.secondary, marginTop: space[2] },
});
