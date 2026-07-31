import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import type { ComponentType, ReactNode } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import "@/signals/location/registerLocationTasks";
import { ThemeProvider } from "@/ui";
import { NativeScreenTimePickerHost } from "@/screentime/native/NativeScreenTimePickerHost";
import { NativeShieldNotificationResponseHost } from "@/notifications";
import { SignalRuntimeHosts } from "@/home/signals";
import { ExperimentRuntimeRoot } from "@/experiments";

export default function RootLayout() {
  const runtime = (
    <>
      <NativeScreenTimePickerHost />
      <NativeShieldNotificationResponseHost />
      <SignalRuntimeHosts />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
    </>
  );

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <StatusBar style="light" />
        <ExperimentRuntimeRoot>
          {withBuildRuntime(runtime)}
        </ExperimentRuntimeRoot>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function withBuildRuntime(children: ReactNode): ReactNode {
  if (process.env.EXPO_PUBLIC_E2E === "1") {
    const { E2ERuntimeRoot } = require(
      "../src/e2e/E2ERuntimeRoot",
    ) as {
      E2ERuntimeRoot: ComponentType<{ children: ReactNode }>;
    };
    return <E2ERuntimeRoot>{children}</E2ERuntimeRoot>;
  }
  return children;
}
