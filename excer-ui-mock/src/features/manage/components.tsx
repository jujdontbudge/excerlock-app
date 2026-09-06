import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  AccessibleModal,
  AppHeader,
  FullScreenModalPage,
  HeaderAction,
  PillButton,
  PressableScale,
  SelectableBubble,
  colors,
  layout,
  space,
  type,
} from '@/design-system';

export function ManageSheet({
  children,
  doneDisabled = false,
  doneLabel = 'Done',
  onCancel,
  onDone,
  title,
  visible,
}: {
  children: ReactNode;
  doneDisabled?: boolean;
  doneLabel?: string;
  onCancel: () => void;
  onDone: () => void;
  title: string;
  visible: boolean;
}) {
  return (
    <AccessibleModal
      accessibilityTitle={title}
      contentContainerStyle={styles.modalPage}
      headerTitle={title}
      onRequestClose={onCancel}
      scrollEnabled={false}
      style={styles.modalOverlay}
      visible={visible}
    >
      <View style={styles.sheetScreen}>
        <FullScreenModalPage
          contentAlignment="top"
          footer={(
            <>
            <PillButton disabled={doneDisabled} fullWidth label={doneLabel} onPress={onDone} variant="screen" />
            <PillButton fullWidth label="Cancel" onPress={onCancel} variant="text" />
            </>
          )}
        >
          {children}
        </FullScreenModalPage>
      </View>
    </AccessibleModal>
  );
}

export function ScreenHeader({
  action,
  actionLabel,
  onBack,
  title,
}: {
  action?: () => void;
  actionLabel?: string;
  onBack?: () => void;
  title: string;
}) {
  const rightAction = action && actionLabel
    ? <HeaderAction label={actionLabel} onPress={action} />
    : undefined;
  return <AppHeader onBack={onBack} rightAction={rightAction} title={title} />;
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

export function Intro({ body, label }: { body: string; label?: string }) {
  return (
    <View style={styles.intro}>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

export function ChoiceRow({
  label,
  onPress,
  selected,
  subtitle,
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
  subtitle?: string;
}) {
  return (
    <SelectableBubble
      fullWidth
      label={label}
      onPress={onPress}
      role="radio"
      selected={selected}
      subtitle={subtitle}
    />
  );
}

export const manageFeatureStyles = StyleSheet.create({
  body: { ...type.body, color: colors.text.secondary },
  bottomSpacer: { height: space[10] },
  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  cardGap: { gap: space[3] },
  caption: { ...type.caption, color: colors.text.secondary },
  center: { alignItems: 'center', gap: space[4], paddingVertical: space[6] },
  content: { gap: space[6], paddingBottom: space[16] },
  divider: { borderTopColor: colors.surface.divider, borderTopWidth: 1, height: 1 },
  emptyTitle: { ...type.cardTitle, color: colors.text.primary, textAlign: 'center' },
  label: { ...type.label, color: colors.text.primary },
  note: { ...type.caption, color: colors.text.tertiary },
  row: { alignItems: 'center', flexDirection: 'row', gap: space[3], justifyContent: 'space-between' },
  rowCopy: { flex: 1, minWidth: 0 },
  screenTitle: { ...type.screenTitle, color: colors.text.primary },
  sectionTitle: { ...type.sectionTitle, color: colors.text.primary },
  title: { ...type.cardTitle, color: colors.text.primary },
});

const styles = StyleSheet.create({
  body: { ...type.body, color: colors.text.secondary },
  intro: { gap: space[2] },
  modalOverlay: { flex: 1 },
  modalPage: { flex: 1 },
  previewLabel: { ...type.micro, color: colors.brand.signatureAmber },
  sectionLabel: { ...type.label, color: colors.text.primary, marginTop: space[2] },
  sheetScreen: { flex: 1, padding: space[5], paddingBottom: 0, paddingTop: 0 },
});
