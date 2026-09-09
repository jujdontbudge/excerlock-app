import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useReducedMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabBarIcon, type TabBarIconName } from './TabBarIcon';
import {
  DOCK_ACTIVE_SCALE,
  DOCK_BAR_HEIGHT,
  DOCK_ICON_SIZE,
  DOCK_INACTIVE_OPACITY,
  DOCK_SAFE_AREA_MIN,
} from './dockGeometry';
import { colors, motion, type } from './tokens';

export { DOCK_BAR_HEIGHT, DOCK_ICON_SIZE } from './dockGeometry';

export interface BottomTabItem<T extends string = string> {
  icon: TabBarIconName;
  key: T;
  label: string;
}

export interface BottomTabBarProps<T extends string = string> {
  activeKey: T;
  items: readonly BottomTabItem<T>[];
  milestoneKey?: T;
  onSelect: (key: T) => void;
}

export function BottomTabBar<T extends string>({ activeKey, items, milestoneKey, onSelect }: BottomTabBarProps<T>) {
  const insets = useSafeAreaInsets();

  return (
    <View pointerEvents="box-none" style={styles.dock} testID="bottom-tab-dock">
      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, DOCK_SAFE_AREA_MIN) }]} testID="bottom-tab-bar">
        <View accessibilityRole="tablist" style={styles.row}>
          {items.map((item) => (
            <DockTab
              active={item.key === activeKey}
              item={item}
              key={item.key}
              milestone={item.key === milestoneKey}
              onPress={() => {
                void Haptics.selectionAsync();
                onSelect(item.key);
              }}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

function DockTab<T extends string>({
  active,
  item,
  milestone,
  onPress,
}: {
  active: boolean;
  item: BottomTabItem<T>;
  milestone: boolean;
  onPress: () => void;
}) {
  const pressed = useSharedValue(1);
  const activeValue = useSharedValue(active ? 1 : 0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    activeValue.value = withTiming(active ? 1 : 0, { duration: reduceMotion ? 0 : motion.duration.fast });
  }, [active, activeValue, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: DOCK_INACTIVE_OPACITY + activeValue.value * (1 - DOCK_INACTIVE_OPACITY),
    transform: [{ scale: pressed.value * (1 + activeValue.value * (DOCK_ACTIVE_SCALE - 1)) }],
  }));

  return (
    <Pressable
      accessibilityLabel={item.label}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      onPressIn={() => {
        pressed.value = withTiming(reduceMotion ? 1 : 0.94, { duration: motion.duration.press });
      }}
      onPressOut={() => {
        pressed.value = withTiming(1, { duration: motion.duration.press });
      }}
      style={styles.tab}
      testID={`bottom-tab-item-${item.key}`}
    >
      <Animated.View style={[styles.tabContent, animatedStyle]}>
        <TabBarIcon
          color={colors.icon.dock}
          name={item.icon}
          size={DOCK_ICON_SIZE}
          testID={`bottom-tab-icon-${item.key}`}
        />
        <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={styles.label}>{item.label}</Text>
        {milestone ? <View accessibilityLabel={`New item in ${item.label}`} style={styles.dot} /> : null}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: 'transparent', width: '100%' },
  dock: {
    backgroundColor: 'transparent',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    width: '100%',
  },
  dot: {
    backgroundColor: colors.brand.signatureAmber,
    borderRadius: 3,
    height: 6,
    position: 'absolute',
    right: -3,
    top: -2,
    width: 6,
  },
  label: {
    ...type.caption,
    color: colors.icon.dock,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '500',
  },
  tabContent: { alignItems: 'center', gap: 4 },
  row: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    flexDirection: 'row',
    height: DOCK_BAR_HEIGHT,
  },
  tab: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    flex: 1,
    height: DOCK_BAR_HEIGHT,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
  },
});
