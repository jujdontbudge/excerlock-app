import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tabItems, TabId } from '../content/tabs';
import { Icon } from '../icons/Icon';
import { Label } from './Label';
import { PressableScale } from './PressableScale';
import { tokens as t } from './tokens';
import { LinearGradient } from 'expo-linear-gradient';
export function TabBar({ selected, onSelect }: { selected: TabId; onSelect: (tab: TabId) => void }) {
  const insets = useSafeAreaInsets();
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
        style={{ position: 'absolute', top: -56, bottom: 0, left: 0, right: 0 }}
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
                tint={selected === tab.id ? t.brand.primary : t.border.mutedStroke}
              />
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
