import { Tabs } from 'expo-router';

import { BottomTabBar, type BottomTabItem } from '@/design-system';
import { useDemo } from '@/presentation';

type TabKey = 'home' | 'manage' | 'analysis' | 'settings';

const items: readonly BottomTabItem<TabKey>[] = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'manage', label: 'Manage', icon: 'manage' },
  { key: 'analysis', label: 'Analysis', icon: 'analysis' },
  { key: 'settings', label: 'Settings', icon: 'settings' },
];

export default function TabLayout() {
  const { dispatch, state } = useDemo();
  const analysisHasNewItem = state.analysis.newBadgeIds.length > 0
    && !state.analysis.milestoneShelfSeen;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: 'transparent' },
        tabBarHideOnKeyboard: true,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          position: 'absolute',
        },
      }}
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
