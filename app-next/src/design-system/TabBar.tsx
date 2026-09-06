import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { tabItems, TabId } from '../content/tabs';
import { Icon } from '../icons/Icon';
import { Label } from './Label';
import { PressableScale } from './PressableScale';
import { tokens as t } from './tokens';
import { useMotion } from '../motion/useMotion';
export function TabBar({ selected, onSelect }: { selected: TabId; onSelect: (tab: TabId) => void }) {
  const [width, setWidth] = useState(0),
    insets = useSafeAreaInsets(),
    m = useMotion(),
    x = useSharedValue(0);
  const index = tabItems.findIndex((tab) => tab.id === selected);
  useEffect(() => {
    const target = ((index + 0.5) * width) / tabItems.length - t.space.lg / 2;
    x.set(m.reduced ? target : withSpring(target, t.motion.spring.control));
  }, [index, width, m.reduced, x]);
  const indicator = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }],
  }));
  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{
        backgroundColor: t.surface.canvas,
        borderTopWidth: t.stroke.hairline,
        borderColor: t.border.default,
        paddingBottom: insets.bottom,
      }}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            height: t.stroke.chart,
            width: t.space.lg,
            borderRadius: t.radius.pill,
            backgroundColor: t.brand.primary,
          },
          indicator,
        ]}
      />
      <View style={{ flexDirection: 'row' }}>
        {tabItems.map((tab) => (
          <View key={tab.id} style={{ flex: 1 }}>
            <PressableScale
              label={tab.title}
              accessibilityRole="tab"
              accessibilityState={{ selected: selected === tab.id }}
              onPress={() => onSelect(tab.id)}
              style={{
                minHeight: t.layout.tabHeight,
                paddingVertical: t.space.sm,
                alignItems: 'center',
                gap: t.space.xs,
              }}>
              <Icon
                name={tab.icon}
                variant="utility"
                size={t.layout.glyph}
                tint={selected === tab.id ? t.brand.primary : t.text.muted}
              />
              <Label
                variant="badge"
                style={{
                  color: selected === tab.id ? t.brand.primary : t.text.muted,
                  textAlign: 'center',
                }}>
                {tab.title}
              </Label>
            </PressableScale>
          </View>
        ))}
      </View>
    </View>
  );
}
