import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  AccessibleModal,
  AccessibleModalTitle,
  PillButton,
  PillowCard,
  PressableScale,
  SheetFrame,
  colors,
  radius,
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
      animationType="slide"
      onRequestClose={onCancel}
      style={styles.modalOverlay}
      visible={visible}
    >
      <SheetFrame
        footer={(
          <View style={styles.sheetActions}>
            <PillButton fullWidth label="Cancel" onPress={onCancel} variant="secondary" />
            <PillButton disabled={doneDisabled} fullWidth label={doneLabel} onPress={onDone} variant="screen" />
          </View>
        )}
      >
        <AccessibleModalTitle style={styles.sheetTitle}>{title}</AccessibleModalTitle>
        {children}
      </SheetFrame>
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
  return (
    <View style={styles.header}>
      {onBack ? <HeaderAction label="‹" accessibilityLabel="Back" onPress={onBack} /> : <View style={styles.headerSpace} />}
      <Text numberOfLines={1} style={styles.headerTitle}>{title}</Text>
      {action && actionLabel ? <HeaderAction label={actionLabel} accessibilityLabel={actionLabel} onPress={action} /> : <View style={styles.headerSpace} />}
    </View>
  );
}

function HeaderAction({ accessibilityLabel, label, onPress }: { accessibilityLabel: string; label: string; onPress: () => void }) {
  return (
    <PressableScale accessibilityLabel={accessibilityLabel} accessibilityRole="button" onPress={onPress}>
      <View style={styles.headerAction}><Text style={styles.headerActionLabel}>{label}</Text></View>
    </PressableScale>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

export function Intro({ body, label }: { body: string; label?: string }) {
  return (
    <View style={styles.intro}>
      {label ? <Text style={styles.previewLabel}>{label}</Text> : null}
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
    <PressableScale
      accessibilityLabel={`${label}${selected ? ', selected' : ''}`}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      pressedScale={0.98}
    >
      <PillowCard style={selected ? styles.selectedCard : undefined} variant={selected ? 'elevated' : 'subtle'}>
        <View style={styles.choiceRow}>
          <View style={styles.choiceCopy}>
            <Text style={styles.choiceTitle}>{label}</Text>
            {subtitle ? <Text style={styles.caption}>{subtitle}</Text> : null}
          </View>
          <View style={[styles.radio, selected && styles.radioSelected]}>
            {selected ? <View style={styles.radioDot} /> : null}
          </View>
        </View>
      </PillowCard>
    </PressableScale>
  );
}

export const manageFeatureStyles = StyleSheet.create({
  body: { ...type.body, color: colors.text.secondary },
  bottomSpacer: { height: space[10] },
  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  cardGap: { gap: space[3] },
  caption: { ...type.caption, color: colors.text.secondary },
  center: { alignItems: 'center', gap: space[3], paddingVertical: space[5] },
  content: { gap: space[4], paddingBottom: space[16] },
  divider: { backgroundColor: colors.surface.divider, height: StyleSheet.hairlineWidth },
  emptyTitle: { ...type.cardTitle, color: colors.text.primary, textAlign: 'center' },
  label: { ...type.label, color: colors.text.secondary },
  note: { ...type.caption, color: colors.text.tertiary },
  row: { alignItems: 'center', flexDirection: 'row', gap: space[3], justifyContent: 'space-between' },
  rowCopy: { flex: 1, minWidth: 0 },
  screenTitle: { ...type.screenTitle, color: colors.text.primary },
  sectionTitle: { ...type.sectionTitle, color: colors.text.primary },
  title: { ...type.cardTitle, color: colors.text.primary },
});

const styles = StyleSheet.create({
  body: { ...type.body, color: colors.text.secondary },
  caption: { ...type.caption, color: colors.text.secondary, marginTop: space[1] },
  choiceCopy: { flex: 1, minWidth: 0 },
  choiceRow: { alignItems: 'center', flexDirection: 'row', gap: space[3] },
  choiceTitle: { ...type.cardTitle, color: colors.text.primary },
  header: { alignItems: 'center', flexDirection: 'row', minHeight: 56 },
  headerAction: { alignItems: 'center', justifyContent: 'center', minHeight: 44, minWidth: 44, paddingHorizontal: space[2] },
  headerActionLabel: { ...type.callout, color: colors.text.primary },
  headerSpace: { height: 44, width: 44 },
  headerTitle: { ...type.screenTitle, color: colors.text.primary, flex: 1, textAlign: 'center' },
  intro: { gap: space[2] },
  modalOverlay: {
    backgroundColor: 'rgba(15, 10, 13, 0.72)',
    flex: 1,
    justifyContent: 'flex-end',
    paddingTop: space[16],
  },
  previewLabel: { ...type.micro, color: colors.brand.signatureAmber },
  radio: { alignItems: 'center', borderColor: colors.text.tertiary, borderRadius: radius.pill, borderWidth: 2, height: 24, justifyContent: 'center', width: 24 },
  radioDot: { backgroundColor: colors.surface.light, borderRadius: radius.pill, height: 8, width: 8 },
  radioSelected: { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary },
  sectionLabel: { ...type.micro, color: colors.text.secondary, marginTop: space[2] },
  selectedCard: { borderColor: colors.brand.primary, borderWidth: 1 },
  sheetActions: { gap: space[2] },
  sheetTitle: { ...type.sheetTitle, color: colors.text.primary, marginBottom: space[4], textAlign: 'center' },
});
