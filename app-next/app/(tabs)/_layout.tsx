import { rulesStore as useRulesStore } from '../../src/packages/conditions/rulesStore';
import { useEffect } from 'react';
import { useRuntime } from '../../src/packages/ports/useRuntime';
import { startProgressSync } from '../../src/packages/home/progressSync';
import { startGymPresenceSync } from '../../src/packages/home/gymPresenceSync';
import { startWalkingSync } from '../../src/packages/home/walkingSync';
import { BankCollect } from '../../src/packages/home/BankCollect';
import { Tabs } from 'expo-router';
import { TabBar } from '../../src/packages/ui';
import { FlyToTargetProvider } from '../../src/packages/ui/FlyToTarget';
import { TabId, tabItems } from '../../src/packages/ui/tabsCopy';
import { tokens as t } from '../../src/packages/ui/tokens';
import { useMotion } from '../../src/packages/ui/useMotion';
import { useDevProtectedRouteMount } from '../../src/packages/launch/DevProtectedRouteMount';
export default function TabLayout() {
  useDevProtectedRouteMount();
  const motion = useMotion(),
    runtime = useRuntime(),
    showShop = useRulesStore((state) =>
      state.data.rules.some((condition) => condition.enabled && condition.mode.kind === 'bank'),
    );
  useEffect(() => startProgressSync(runtime), [runtime]);
  useEffect(() => startGymPresenceSync(runtime), [runtime]);
  useEffect(() => startWalkingSync(runtime), [runtime]);
  return (
    <FlyToTargetProvider>
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
            showShop={showShop}
            selected={state.routes[state.index].name as TabId}
            accessory={state.routes[state.index].name === 'home' ? <BankCollect /> : null}
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
    </FlyToTargetProvider>
  );
}
