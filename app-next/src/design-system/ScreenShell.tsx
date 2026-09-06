import { PropsWithChildren, ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { tokens as t } from './tokens';
export function ScreenShell({
  children,
  footer,
  header,
  overlay,
  safeBottom = true,
  tinted = true,
}: PropsWithChildren<{
  footer?: ReactNode;
  header?: ReactNode;
  overlay?: ReactNode;
  safeBottom?: boolean;
  tinted?: boolean;
}>) {
  return (
    <View style={s.root}>
      {tinted ? (
        <LinearGradient
          pointerEvents="none"
          colors={[t.surface.topTint, t.surface.topTintMid, t.surface.canvas]}
          locations={[0, t.layout.washMid / t.layout.wash, 1]}
          style={s.wash}
        />
      ) : null}
      <SafeAreaView style={s.rootClear} edges={safeBottom ? ['top', 'bottom'] : ['top']}>
        <KeyboardAvoidingView behavior="padding" style={s.rootClear}>
          {header}
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.content}
            showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
          {footer ? <View style={s.footer}>{footer}</View> : null}
        </KeyboardAvoidingView>
      </SafeAreaView>
      {overlay}
    </View>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: t.surface.canvas },
  rootClear: { flex: 1 },
  wash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: t.layout.wash,
  },
  content: {
    flexGrow: 1,
    padding: t.layout.page,
    gap: t.space.xl,
    width: '100%',
    maxWidth: t.layout.maxWidth,
    alignSelf: 'center',
  },
  footer: {
    paddingHorizontal: t.layout.page,
    paddingVertical: t.space.md,
    gap: t.space.sm,
    backgroundColor: t.surface.canvas,
  },
});
