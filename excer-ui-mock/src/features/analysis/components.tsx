import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppHeader, PressableScale, colors, radius, space, type } from '@/design-system';

export function AnalysisHeader({ onBack, title }: { onBack?: () => void; title: string }) {
  return <AppHeader onBack={onBack} title={title} />;
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
  center: { alignItems: 'center', gap: space[4], paddingVertical: space[6] },
  content: { gap: space[6], paddingBottom: space[16] },
  hero: { ...type.heroMd, color: colors.text.primary },
  label: { ...type.label, color: colors.text.primary },
  note: { ...type.caption, color: colors.text.tertiary },
  row: { alignItems: 'center', flexDirection: 'row', gap: space[3], justifyContent: 'space-between' },
  rowCopy: { flex: 1, minWidth: 0 },
  title: { ...type.cardTitle, color: colors.text.primary },
});

const styles = StyleSheet.create({
  eyebrow: { ...type.label, color: colors.text.primary },
  section: { ...type.sectionTitle, color: colors.text.primary, flex: 1 },
  sectionRow: { alignItems: 'center', flexDirection: 'row', gap: space[3] },
  textAction: { alignItems: 'center', borderRadius: radius.pill, justifyContent: 'center', minHeight: 44, paddingHorizontal: space[3] },
  textActionLabel: { ...type.label, color: colors.text.primary },
});
