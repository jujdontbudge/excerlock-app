import type { PropsWithChildren, ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader, HeaderAction } from './AppHeader';
import { colors, space, type } from './tokens';

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
      {title || onBack || onClose ? (
        <AppHeader
          onBack={onBack}
          rightAction={onClose ? <HeaderAction label="Close" onPress={onClose}><Text style={styles.close}>×</Text></HeaderAction> : undefined}
          title={title}
        />
      ) : null}
      {content}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  close: { ...type.navigationTitle, color: colors.text.primary },
  fixedContent: { flex: 1, paddingHorizontal: space[5] },
  footer: { borderTopColor: colors.surface.divider, borderTopWidth: 1, padding: space[4] },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: space[6], paddingHorizontal: space[5] },
  sheet: {
    backgroundColor: 'transparent',
    flex: 1,
  },
});
