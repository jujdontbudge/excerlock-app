import { useEffect } from 'react';
import { useRuntime } from '../../src/runtime/AppRuntimeProvider';
import { startProgressSync } from '../../src/features/home/progressSync';
import { startGymPresenceSync } from '../../src/features/home/gymPresenceSync';
import { startWalkingSync } from '../../src/features/home/walkingSync';
import { Tabs } from 'expo-router';
import { TabBar } from '../../src/design-system';
import { TabId, tabItems } from '../../src/content/tabs';
import { tokens as t } from '../../src/design-system/tokens';
import { useMotion } from '../../src/motion/useMotion';
export default function TabLayout() {
  const motion = useMotion(),
    runtime = useRuntime();
  useEffect(() => startProgressSync(runtime), [runtime]);
  useEffect(() => startGymPresenceSync(runtime), [runtime]);
  useEffect(() => startWalkingSync(runtime), [runtime]);
  return (
    <Tabs
      initialRouteName="home"
      detachInactiveScreens={false}
      screenOptions={{
        headerShown: false,
        lazy: false,
        animation: motion.reduced ? 'fade' : 'shift',
        sceneStyle: { backgroundColor: t.surface.card },
      }}
      tabBar={({ state, navigation }) => (
        <TabBar
          selected={state.routes[state.index].name as TabId}
          onSelect={(tab) => {
            const route = state.routes.find((r) => r.name === tab)!;
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!event.defaultPrevented) navigation.navigate(tab);
          }}
        />
      )}>
      {tabItems.map((tab) => (
        <Tabs.Screen key={tab.id} name={tab.id} options={{ title: tab.title }} />
      ))}
    </Tabs>
  );
}
