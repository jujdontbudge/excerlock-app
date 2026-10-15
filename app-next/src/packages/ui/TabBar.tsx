import { ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useFlyTarget } from './FlyToTarget';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tabItems, TabId } from './tabsCopy';
import { Icon } from './Icon';
import { Label } from './Label';
import { PressableScale } from './PressableScale';
import { tokens as t } from './tokens';
import { LinearGradient } from 'expo-linear-gradient';
export function TabBar({
  selected,
  onSelect,
  showShop = false,
  accessory,
}: {
  selected: TabId;
  onSelect: (tab: TabId) => void;
  showShop?: boolean;
  accessory?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const home = useFlyTarget('home', t.motion.reward.tabPulse);
  return (
    <View
      pointerEvents="box-none"
      testID="transparent-dock"
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'transparent',
        paddingBottom: insets.bottom,
      }}>
      <LinearGradient
        pointerEvents="none"
        colors={t.surface.tabBarGradient}
        locations={[0, 0.42, 1]}
        style={{ position: 'absolute', top: -t.layout.dockFade, bottom: 0, left: 0, right: 0 }}
      />
      {accessory ? (
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: t.layout.tabHeight + insets.bottom + t.space.sm,
            alignItems: 'center',
          }}>
          {accessory}
        </View>
      ) : null}
      <View style={{ flexDirection: 'row' }}>
        {tabItems.filter((tab) => tab.id !== 'shop' || showShop).map((tab) => (
          <View key={tab.id} style={{ flex: 1 }}>
            <PressableScale
              label={tab.title}
              accessibilityRole="tab"
              accessibilityState={{ selected: selected === tab.id }}
              haptic={selected === tab.id ? 'none' : 'select'}
              onPress={() => onSelect(tab.id)}
              style={{
                minHeight: t.layout.tabHeight,
                paddingVertical: t.space.sm,
                alignItems: 'center',
                gap: t.space.xs,
              }}>
              <Animated.View
                ref={tab.id === 'home' ? home.ref : undefined}
                collapsable={false}
                style={tab.id === 'home' ? home.style : undefined}>
                <Icon
                  name={tab.icon}
                  variant="utility"
                  size={t.icon.md}
                  tone={selected === tab.id ? 'accent' : 'muted'}
                />
              </Animated.View>
              <Label
                variant="micro"
                style={{
                  color: selected === tab.id ? t.text.primary : t.text.secondary,
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
