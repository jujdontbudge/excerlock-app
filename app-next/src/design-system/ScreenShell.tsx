import { PropsWithChildren, ReactNode, useEffect, useLayoutEffect, useRef } from 'react';
import { Keyboard, KeyboardAvoidingView, LayoutChangeEvent, ScrollView, StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { tokens as t } from './tokens';
export function ScreenShell({
  children,
  footer,
  header,
  overlay,
  background,
  safeBottom = true,
  dock = false,
  scrollUnderStatusBar = true,
  tinted = true,
  orangeBackground = true,
  scrollToEndOnKeyboard = false,
  scrollResetKey,
  scrollEnabled = true,
  fullBleed = false,
  contentStyle,
  onLayout,
}: PropsWithChildren<{
  footer?: ReactNode;
  header?: ReactNode;
  overlay?: ReactNode;
  background?: ReactNode;
  safeBottom?: boolean;
  dock?: boolean;
  scrollUnderStatusBar?: boolean;
  tinted?: boolean;
  orangeBackground?: boolean;
  scrollToEndOnKeyboard?: boolean;
  scrollResetKey?: string;
  scrollEnabled?: boolean;
  fullBleed?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  onLayout?: (event: LayoutChangeEvent) => void;
}>) {
  const scroll = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
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
    <View style={s.root} onLayout={onLayout}>
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
      {background}
      <SafeAreaView
        style={s.rootClear}
        edges={scrollUnderStatusBar
          ? (safeBottom && !footer ? ['bottom'] : [])
          : safeBottom && !footer ? ['top', 'bottom'] : ['top']}>
        <KeyboardAvoidingView behavior="padding" style={s.rootClear}>
          {!scrollUnderStatusBar ? header : null}
          <ScrollView
            testID="screen-scroll"
            ref={scroll}
            scrollEnabled={scrollEnabled}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              s.content,
              contentStyle,
              dock && { paddingBottom: t.layout.tabHeight + insets.bottom + t.space.xl },
              footer && !fullBleed && { paddingBottom: t.layout.button + insets.bottom + t.space.xl },
              scrollUnderStatusBar && !fullBleed && { paddingTop: insets.top + t.space.xs },
              fullBleed && { paddingTop: 0 },
            ]}
            showsVerticalScrollIndicator={false}>
            {scrollUnderStatusBar && header ? (
              <View style={{ marginHorizontal: -t.layout.page, marginBottom: t.space.xs - t.space.xl }}>
                {header}
              </View>
            ) : null}
            {children}
          </ScrollView>
          {footer ? <View style={[s.footer, { paddingBottom: insets.bottom + t.space.xs }]}>{footer}</View> : null}
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
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    paddingHorizontal: t.layout.page,
    paddingTop: t.space.sm,
    gap: t.space.sm,
    backgroundColor: t.surface.transparent,
  },
});
