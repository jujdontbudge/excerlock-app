import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import type { ComponentType, ReactNode } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import "@/signals/location/registerLocationTasks";
import { AccountRuntimeRoot } from "@/account";
import { ThemeProvider } from "@/ui";
import { NativeScreenTimePickerHost } from "@/screentime/native/NativeScreenTimePickerHost";
import { NativeShieldNotificationResponseHost } from "@/notifications";
import { SignalRuntimeHosts } from "@/home/signals";
import { ExperimentRuntimeRoot } from "@/experiments";
import { installDiagnostics } from "@/diagnostics";

export default function RootLayout() {
  const productRuntime = <ProductRuntime />;
  if (process.env.EXPO_PUBLIC_TEST_HARNESS === "1") {
    const { HarnessBuildRoot } = require(
      "../src/harness/HarnessBuildRoot"
    ) as {
      HarnessBuildRoot: ComponentType<{ productRuntime: ReactNode }>;
    };
    return <HarnessBuildRoot productRuntime={productRuntime} />;
  }
  return productRuntime;
}

let diagnosticsInstalled = false;

function ProductRuntime() {
  // Must happen only inside the product branch: harness mode must not install
  // the shared walking controller it is intended to observe in isolation.
  if (!diagnosticsInstalled) {
    installDiagnostics();
    diagnosticsInstalled = true;
  }
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
      <AccountRuntimeRoot>
        <ThemeProvider>
          <StatusBar style="light" />
          <ExperimentRuntimeRoot>
            {withBuildRuntime(runtime)}
          </ExperimentRuntimeRoot>
        </ThemeProvider>
      </AccountRuntimeRoot>
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
