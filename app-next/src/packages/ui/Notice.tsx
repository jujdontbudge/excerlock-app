import { useEffect } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { Label } from './Label';
import { fadeIn, fadeOut } from './presets';
import { tokens as t } from './tokens';

const useNoticeStore = create<{ text: string; key: number }>(() => ({ text: '', key: 0 }));

export function notify(text: string) {
  useNoticeStore.setState((state) => ({ text, key: state.key + 1 }));
  AccessibilityInfo.announceForAccessibility(text);
}

function dismiss() {
  useNoticeStore.setState({ text: '' });
}

export function NoticeHost() {
  const text = useNoticeStore((state) => state.text),
    key = useNoticeStore((state) => state.key),
    top = useSafeAreaInsets().top;
  useEffect(() => {
    if (!text) return;
    const timer = setTimeout(dismiss, t.motion.hold.notice);
    return () => clearTimeout(timer);
  }, [text, key]);
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: top + t.space.sm, left: t.layout.page, right: t.layout.page, alignItems: 'center' }}>
      {text ? (
        <Animated.View key={key} entering={fadeIn} exiting={fadeOut} pointerEvents="none">
          <View
            accessible
            accessibilityLabel={text}
            style={{
              paddingHorizontal: t.space.xl,
              paddingVertical: t.space.md,
              borderRadius: t.radius.pill,
              borderWidth: t.stroke.hairline,
              borderColor: t.border.outline,
              backgroundColor: t.surface.card,
              boxShadow: t.shadow.control,
            }}>
            <Label variant="label" style={{ textAlign: 'center' }}>
              {text}
            </Label>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}
