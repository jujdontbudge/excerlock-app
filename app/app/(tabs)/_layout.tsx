import { Tabs } from "expo-router";

import {
  AnalysisTabIcon,
  LiveMilestoneDiscovery,
} from "@/analysis";
import { TAB_ROUTES, TabBarIcon, tabScreenOptions } from "@/ui";

export default function TabLayout() {
  return (
    <>
      <LiveMilestoneDiscovery />
      <Tabs screenOptions={tabScreenOptions()}>
        {TAB_ROUTES.map((route) => (
          <Tabs.Screen
            key={route.name}
            name={route.name}
            options={{
              title: route.title,
              // Text-matching a tab is ambiguous — Home's shortcut rows carry
              // the same labels (observed 2026-08-04: tapOn "Analysis" hit the
              // row under the floating bar and nothing navigated).
              tabBarButtonTestID: `tab-${route.name}`,
              tabBarIcon: ({ color, size }) =>
                route.name === "analysis" ? (
                  <AnalysisTabIcon color={color} size={size} />
                ) : (
                  <TabBarIcon
                    icon={route.icon}
                    color={color}
                    size={size}
                  />
                ),
            }}
          />
        ))}
      </Tabs>
    </>
  );
}
