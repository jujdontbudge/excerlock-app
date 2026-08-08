import type { ImageSourcePropType } from 'react-native';
import { Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PressableScale } from './PressableScale';
import { colors, layout, space, type } from './tokens';

export interface BottomTabItem<T extends string = string> {
  icon: ImageSourcePropType;
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
  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <View accessibilityRole="tablist" style={styles.bar}>
        {items.map((item) => {
          const active = item.key === activeKey;
          return (
            <PressableScale
              accessibilityLabel={item.label}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              contentStyle={styles.tab}
              key={item.key}
              onPress={() => onSelect(item.key)}
              pressedScale={0.96}
              style={styles.tabHost}
            >
              <View style={styles.iconFrame}>
                <Image
                  accessibilityIgnoresInvertColors
                  resizeMode="contain"
                  source={item.icon}
                  style={styles.icon}
                  testID={`bottom-tab-icon-${item.key}`}
                  tintColor={active ? colors.icon.primary : colors.icon.inactive}
                />
                {item.key === milestoneKey ? <View accessibilityLabel={`New item in ${item.label}`} style={styles.dot} /> : null}
              </View>
              <Text style={[styles.label, !active && styles.inactive]}>{item.label}</Text>
            </PressableScale>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', height: layout.tabBarHeight, width: '100%' },
  dot: {
    backgroundColor: colors.brand.energy,
    borderRadius: 3,
    height: 6,
    position: 'absolute',
    right: -2,
    top: -1,
    width: 6,
  },
  icon: { height: 29, width: 29 },
  iconFrame: { alignItems: 'center', justifyContent: 'center' },
  inactive: { color: colors.icon.inactive },
  label: { ...type.tab, color: colors.text.primary, marginTop: space[1] },
  safeArea: { backgroundColor: 'rgba(40,16,8,0.34)' },
  tab: { alignItems: 'center', justifyContent: 'center' },
  tabHost: { flex: 1, minWidth: 64 },
});
