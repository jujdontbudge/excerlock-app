import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppHeader, colors, space, type } from '@/design-system';

export function SettingsHeader({ light = false, onBack, title }: { light?: boolean; onBack?: () => void; title: string }) {
  return <AppHeader onBack={onBack} title={title} />;
}

export function SectionLabel({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return <Text style={[styles.sectionLabel, light && styles.inkSecondary]}>{children}</Text>;
}

export function PrototypeLabel(_props: { children?: ReactNode; light?: boolean }) {
  return null;
}

export const settingsFeatureStyles = StyleSheet.create({
  body: { ...type.body, color: colors.text.secondary },
  cardGap: { gap: space[3] },
  center: { alignItems: 'center', gap: space[4], paddingVertical: space[6] },
  content: { gap: space[6], paddingBottom: space[16] },
  divider: { borderTopColor: colors.surface.divider, borderTopWidth: 1, height: 1 },
  label: { ...type.label, color: colors.text.primary },
  note: { ...type.caption, color: colors.text.tertiary },
  row: { alignItems: 'center', flexDirection: 'row', gap: space[3], justifyContent: 'space-between' },
  rowCopy: { flex: 1, minWidth: 0 },
  sectionTitle: { ...type.sectionTitle, color: colors.text.primary },
  title: { ...type.cardTitle, color: colors.text.primary },
});

const styles = StyleSheet.create({
  inkSecondary: { color: colors.text.ink },
  sectionLabel: { ...type.label, color: colors.text.primary, marginTop: space[2] },
});
