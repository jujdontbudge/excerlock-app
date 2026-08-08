import { Tabs } from 'expo-router';

import { assetRegistry } from '@/content';
import { BottomTabBar, type BottomTabItem } from '@/design-system';
import { useDemo } from '@/presentation';

type TabKey = 'home' | 'manage' | 'analysis' | 'settings';

const items: readonly BottomTabItem<TabKey>[] = [
  { key: 'home', label: 'Home', icon: assetRegistry.glyphs['icon-tab-home'] },
  { key: 'manage', label: 'Manage', icon: assetRegistry.glyphs['icon-tab-manage'] },
  { key: 'analysis', label: 'Analysis', icon: assetRegistry.glyphs['icon-tab-chart'] },
  { key: 'settings', label: 'Settings', icon: assetRegistry.glyphs['icon-tab-settings'] },
];

export default function TabLayout() {
  const { dispatch, state } = useDemo();
  const analysisHasNewItem = state.analysis.newBadgeIds.length > 0
    && !state.analysis.milestoneShelfSeen;

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ state, navigation }) => {
        const activeKey = state.routes[state.index]?.name as TabKey;
        return (
          <BottomTabBar
            activeKey={activeKey}
            items={items}
            milestoneKey={analysisHasNewItem ? 'analysis' : undefined}
            onSelect={(key) => {
              const route = state.routes.find((candidate) => candidate.name === key);
              if (!route) return;
              const event = navigation.emit({
                canPreventDefault: true,
                target: route.key,
                type: 'tabPress',
              });
              if (event.defaultPrevented) return;
              dispatch({ type: 'tab/select', tab: key });
              navigation.navigate(key);
            }}
          />
        );
      }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="manage" />
      <Tabs.Screen name="analysis" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
