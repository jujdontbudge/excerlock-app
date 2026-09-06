import { PropsWithChildren, ReactNode, useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeOut,
  FadeOutDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokens as t } from './tokens';
import { Label } from './Label';
import { Icon } from '../icons/Icon';
import { PressableScale } from './PressableScale';
import { controls } from '../content/controls';
import { useMotion } from '../motion/useMotion';
import { feedback } from '../motion/haptics';
import { useSheetKeyboard } from '../motion/useSheetKeyboard';
type Props = PropsWithChildren<{
  open: boolean;
  footer?: ReactNode;
  title: string;
  onDismiss: () => void;
}>;
export function BottomSheet(props: Props) {
  return props.open ? <SheetPanel {...props} /> : null;
}
function SheetPanel({ title, onDismiss, children, footer }: Props) {
  const { height } = useWindowDimensions(),
    insets = useSafeAreaInsets(),
    m = useMotion(),
    y = useSharedValue(m.reduced ? 0 : height);
  const keyboard = useSheetKeyboard(height);
  useEffect(() => {
    y.set(m.reduced ? 0 : withSpring(0, t.motion.spring.sheet));
  }, [y, m.reduced]);
  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .onUpdate((e) => {
          y.set(Math.max(0, e.translationY));
        })
        .onEnd((e) => {
          if (y.get() > t.motion.distance.dismiss || e.velocityY > t.motion.velocity.dismiss) {
            y.set(
              withTiming(height, { duration: t.motion.duration.sheet }, (finished) => {
                if (finished) scheduleOnRN(onDismiss);
              }),
            );
          } else y.set(withSpring(0, t.motion.spring.sheet));
        }),
    [height, onDismiss, y],
  );
  const position = useAnimatedStyle(() => ({
    transform: [{ translateY: y.get() }],
  }));
  return (
    <Animated.View
      accessibilityViewIsModal
      entering={FadeIn.duration(m.duration.fast)}
      exiting={FadeOut.duration(m.duration.sheet)}
      style={[StyleSheet.absoluteFill, { zIndex: 100, backgroundColor: t.surface.scrim }]}>
      <Pressable
        style={StyleSheet.absoluteFill}
        accessibilityRole="button"
        accessibilityLabel={controls.dismissSheet}
        onPress={() => {
          feedback();
          onDismiss();
        }}
      />
      <Animated.View
        exiting={m.reduced ? FadeOut.duration(m.duration.fast) : FadeOutDown.duration(m.duration.sheet)}
        style={[
          {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            maxHeight: height * t.layout.sheetMax,
            backgroundColor: t.surface.canvas,
            borderTopLeftRadius: t.radius.sheet,
            borderTopRightRadius: t.radius.sheet,
            paddingBottom: Math.max(insets.bottom, t.space.lg),
          },
          position,
          keyboard,
        ]}>
        <GestureDetector gesture={gesture}>
          <Animated.View accessible={false} style={{ paddingHorizontal: t.space.xl, paddingTop: t.space.md }}>
            <View
              accessibilityLabel={controls.dragSheet}
              style={{
                alignSelf: 'center',
                width: t.layout.grabber,
                height: t.space.xs,
                borderRadius: t.radius.pill,
                backgroundColor: t.border.default,
              }}
            />
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: t.space.md,
                paddingVertical: t.space.md,
              }}>
              <Label accessibilityRole="header" variant="section" style={{ flex: 1 }}>
                {title}
              </Label>
              <PressableScale
                label={controls.close}
                onPress={onDismiss}
                style={{ minWidth: t.layout.touch, alignItems: 'center' }}>
                <Icon name="close" variant="utility" size={t.layout.glyph} />
              </PressableScale>
            </View>
          </Animated.View>
        </GestureDetector>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: t.space.xl,
            paddingBottom: t.space.lg,
            gap: t.space.lg,
          }}>
          {children}
        </ScrollView>
        {footer ? <View style={{ paddingHorizontal: t.space.xl, paddingTop: t.space.md }}>{footer}</View> : null}
      </Animated.View>
    </Animated.View>
  );
}
