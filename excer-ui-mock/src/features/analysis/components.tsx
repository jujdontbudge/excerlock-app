import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale, colors, radius, space, type } from '@/design-system';

export function AnalysisHeader({ onBack, title }: { onBack?: () => void; title: string }) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <PressableScale accessibilityLabel="Back" accessibilityRole="button" onPress={onBack}>
          <View style={styles.action}><Text style={styles.back}>‹</Text></View>
        </PressableScale>
      ) : <View style={styles.action} />}
      <Text accessibilityRole="header" numberOfLines={1} style={styles.title}>{title}</Text>
      <View style={styles.action} />
    </View>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <Text style={styles.eyebrow}>{children}</Text>;
}

export function SectionHeading({ action, actionLabel, children }: { action?: () => void; actionLabel?: string; children: ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.section}>{children}</Text>
      {action && actionLabel ? (
        <PressableScale accessibilityLabel={actionLabel} accessibilityRole="button" onPress={action}>
          <View style={styles.textAction}><Text style={styles.textActionLabel}>{actionLabel}</Text></View>
        </PressableScale>
      ) : null}
    </View>
  );
}

export const analysisFeatureStyles = StyleSheet.create({
  body: { ...type.body, color: colors.text.secondary },
  cardGap: { gap: space[3] },
  center: { alignItems: 'center', gap: space[3], paddingVertical: space[5] },
  content: { gap: space[4], paddingBottom: space[16] },
  hero: { ...type.heroMd, color: colors.text.primary },
  label: { ...type.label, color: colors.text.secondary },
  note: { ...type.caption, color: colors.text.tertiary },
  row: { alignItems: 'center', flexDirection: 'row', gap: space[3], justifyContent: 'space-between' },
  rowCopy: { flex: 1, minWidth: 0 },
  title: { ...type.cardTitle, color: colors.text.primary },
});

const styles = StyleSheet.create({
  action: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  back: { color: colors.text.primary, fontSize: 34, fontWeight: '300', lineHeight: 38 },
  eyebrow: { ...type.micro, color: colors.brand.signatureAmber },
  header: { alignItems: 'center', flexDirection: 'row', minHeight: 56 },
  section: { ...type.sectionTitle, color: colors.text.primary, flex: 1 },
  sectionRow: { alignItems: 'center', flexDirection: 'row', gap: space[3] },
  textAction: { alignItems: 'center', borderRadius: radius.pill, justifyContent: 'center', minHeight: 44, paddingHorizontal: space[3] },
  textActionLabel: { ...type.label, color: colors.text.primary },
  title: { ...type.screenTitle, color: colors.text.primary, flex: 1, textAlign: 'center' },
});
