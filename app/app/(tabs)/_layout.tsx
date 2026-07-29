import { Tabs } from "expo-router";

import { TAB_ROUTES, TabBarIcon, tabScreenOptions } from "@/ui";

export default function TabLayout() {
  return (
    <Tabs screenOptions={tabScreenOptions()}>
      {TAB_ROUTES.map((route) => (
        <Tabs.Screen
          key={route.name}
          name={route.name}
          options={{
            title: route.title,
            tabBarIcon: ({ color, size }) => (
              <TabBarIcon icon={route.icon} color={color} size={size} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
