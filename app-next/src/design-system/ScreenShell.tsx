import { PropsWithChildren, ReactNode, useEffect, useLayoutEffect, useRef } from 'react';
import { Keyboard, KeyboardAvoidingView, ScrollView, StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
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
  orangeBackground = true,
  scrollToEndOnKeyboard = false,
  scrollResetKey,
  contentStyle,
}: PropsWithChildren<{
  footer?: ReactNode;
  header?: ReactNode;
  overlay?: ReactNode;
  safeBottom?: boolean;
  tinted?: boolean;
  orangeBackground?: boolean;
  scrollToEndOnKeyboard?: boolean;
  scrollResetKey?: string;
  contentStyle?: StyleProp<ViewStyle>;
}>) {
  const scroll = useRef<ScrollView>(null);
  useLayoutEffect(() => {
    if (scrollResetKey === undefined) return;
    scroll.current?.scrollTo({ y: 0, animated: false });
    const frame = requestAnimationFrame(() => scroll.current?.scrollTo({ y: 0, animated: false }));
    return () => cancelAnimationFrame(frame);
  }, [scrollResetKey]);
  useEffect(() => {
    if (!scrollToEndOnKeyboard) return;
    const listener = Keyboard.addListener('keyboardDidShow', () => scroll.current?.scrollToEnd({ animated: true }));
    return () => listener.remove();
  }, [scrollToEndOnKeyboard]);
  return (
    <View style={s.root}>
      {tinted ? (
        <LinearGradient
          pointerEvents="none"
          colors={
            orangeBackground ? t.surface.orangeGradient : [t.surface.topTint, t.surface.topTintMid, t.surface.canvas]
          }
          locations={orangeBackground ? [0, 0.35, 1] : [0, t.layout.washMid / t.layout.wash, 1]}
          style={orangeBackground ? [s.wash, { height: '100%' }] : s.wash}
        />
      ) : null}
      <SafeAreaView style={s.rootClear} edges={safeBottom ? ['top', 'bottom'] : ['top']}>
        <KeyboardAvoidingView behavior="padding" style={s.rootClear}>
          {header}
          <ScrollView
            ref={scroll}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[s.content, contentStyle]}
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
    backgroundColor: t.surface.transparent,
  },
});
