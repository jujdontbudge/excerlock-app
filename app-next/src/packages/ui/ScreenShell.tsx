import { PropsWithChildren, ReactNode, useEffect, useLayoutEffect, useRef } from 'react';
import { Keyboard, KeyboardAvoidingView, LayoutChangeEvent, ScrollView, TextInput, StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
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
  bounce = true,
  scrollUnderStatusBar = true,
  tinted = true,
  orangeBackground = true,
  scrollToEndOnKeyboard = false,
  scrollResetKey,
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
  bounce?: boolean;
  scrollUnderStatusBar?: boolean;
  tinted?: boolean;
  orangeBackground?: boolean;
  scrollToEndOnKeyboard?: boolean;
  scrollResetKey?: string;
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
    const listener = Keyboard.addListener('keyboardDidShow', () => {
      if (scrollToEndOnKeyboard) {
        scroll.current?.scrollToEnd({ animated: true });
      } else {
        const field = TextInput.State.currentlyFocusedInput();
        if (field) scroll.current?.scrollResponderScrollNativeHandleToKeyboard(field, t.space.xl, true);
      }
    });
    return () => listener.remove();
  }, [scrollToEndOnKeyboard]);
  return (
    <View style={s.root} onLayout={onLayout}>
      {tinted ? (
        <LinearGradient
          pointerEvents="none"
          colors={
            orangeBackground ? t.surface.orangeGradient : [t.surface.topTint, t.surface.topTintMid, t.surface.card]
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
          <ScrollView
            testID="screen-scroll"
            ref={scroll}
            alwaysBounceVertical={bounce}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={[
              s.content,
              { paddingTop: 0, paddingBottom: 0 },
              dock && { paddingBottom: t.layout.tabHeight + insets.bottom + t.space.xl },
              scrollUnderStatusBar && !fullBleed && { paddingTop: (header ? 0 : insets.top) + t.space.xs },
              fullBleed && { paddingTop: 0 },
              contentStyle,
            ]}
            showsVerticalScrollIndicator={false}>
            {header ? (
              <View style={[s.bleed, scrollUnderStatusBar ? { paddingTop: insets.top } : undefined]}>{header}</View>
            ) : null}
            <View
              onTouchStart={(event) => {
                const focused = TextInput.State.currentlyFocusedInput();
                const { pageX, pageY } = event.nativeEvent;
                focused?.measureInWindow((x, y, width, height) => {
                  if (pageX < x || pageX > x + width || pageY < y || pageY > y + height) Keyboard.dismiss();
                });
              }}
              style={s.contentBody}>{children}</View>
            {footer ? (
              <View testID="screen-footer" style={[s.bleed, s.inlineFooter, { paddingBottom: insets.bottom + t.space.xs }]}>
                {footer}
              </View>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      {overlay}
    </View>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: t.surface.card },
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
  contentBody: { flexGrow: 1, gap: t.space.xl },
  bleed: { marginHorizontal: -t.layout.page },
  inlineFooter: { paddingHorizontal: t.layout.page, paddingTop: t.space.sm, gap: t.space.sm },
});
