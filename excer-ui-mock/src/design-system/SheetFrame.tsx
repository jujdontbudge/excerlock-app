import type { PropsWithChildren, ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PressableScale } from './PressableScale';
import { colors, radius, space, type } from './tokens';

export interface SheetFrameProps extends PropsWithChildren {
  contentContainerStyle?: StyleProp<ViewStyle>;
  footer?: ReactNode;
  onBack?: () => void;
  onClose?: () => void;
  scrollable?: boolean;
  style?: StyleProp<ViewStyle>;
  title?: string;
}

export function SheetFrame({
  children,
  contentContainerStyle,
  footer,
  onBack,
  onClose,
  scrollable = true,
  style,
  title,
}: SheetFrameProps) {
  const content = scrollable ? (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      style={styles.scroll}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.fixedContent, contentContainerStyle]}>{children}</View>
  );

  return (
    <SafeAreaView edges={['bottom']} style={[styles.sheet, style]}>
      <View accessibilityElementsHidden style={styles.grabber} />
      {title || onBack || onClose ? (
        <View style={styles.header}>
          <SheetHeaderAction accessibilityLabel="Back" label="‹" onPress={onBack} />
          <Text numberOfLines={1} style={styles.title}>{title}</Text>
          <SheetHeaderAction accessibilityLabel="Close" label="×" onPress={onClose} />
        </View>
      ) : null}
      {content}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

function SheetHeaderAction({ accessibilityLabel, label, onPress }: { accessibilityLabel: string; label: string; onPress?: () => void }) {
  if (!onPress) {
    return <View style={styles.headerSpacer} />;
  }
  return (
    <PressableScale accessibilityLabel={accessibilityLabel} accessibilityRole="button" onPress={onPress}>
      <View style={styles.headerButton}><Text style={styles.headerButtonLabel}>{label}</Text></View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  fixedContent: { flex: 1, paddingHorizontal: space[5] },
  footer: { borderTopColor: colors.surface.divider, borderTopWidth: StyleSheet.hairlineWidth, padding: space[4] },
  grabber: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.30)',
    borderRadius: radius.pill,
    height: 5,
    marginBottom: space[2],
    marginTop: space[2],
    width: 44,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: space[3],
  },
  headerButton: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  headerButtonLabel: { color: colors.text.primary, fontSize: 30, fontWeight: '300', lineHeight: 34 },
  headerSpacer: { height: 44, width: 44 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: space[6], paddingHorizontal: space[5] },
  sheet: {
    backgroundColor: colors.surface.sheet,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    flex: 1,
    overflow: 'hidden',
  },
  title: { ...type.sheetTitle, color: colors.text.primary, flex: 1, textAlign: 'center' },
});
