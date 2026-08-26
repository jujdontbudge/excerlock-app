import { useMemo, useState, type ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { HarnessApp } from "./HarnessApp";
import { createHarnessCameraRuntime } from "./HarnessCameraRuntime";

type BuildMode = "choose" | "harness" | "product";

export function HarnessBuildRoot({
  productRuntime,
}: Readonly<{ productRuntime: ReactNode }>) {
  const [mode, setMode] = useState<BuildMode>("choose");

  if (mode === "product") {
    return (
      <View style={styles.productContainer}>
        {productRuntime}
        <Pressable
          accessibilityRole="button"
          onPress={() => setMode("choose")}
          style={styles.modeSwitch}
        >
          <Text style={styles.modeSwitchLabel}>Switch mode</Text>
        </Pressable>
      </View>
    );
  }
  if (mode === "harness") {
    return <HarnessMode onSwitch={() => setMode("choose")} />;
  }
  return (
    <HarnessPage>
      <Text style={styles.title}>Choose a mode</Text>
      <Text style={styles.body}>
        The test harness observes signals without mounting ExcerLock runtime
        policy.
      </Text>
      <ModeButton label="Test harness" onPress={() => setMode("harness")} />
      <ModeButton label="Real app" onPress={() => setMode("product")} />
    </HarnessPage>
  );
}

function HarnessMode({ onSwitch }: Readonly<{ onSwitch: () => void }>) {
  const camera = useMemo(createHarnessCameraRuntime, []);
  return (
    <View style={styles.productContainer}>
      <HarnessApp
        CameraPreview={camera.Preview}
        footage={camera.capture}
        sources={{ camera: camera.source }}
      />
      <Pressable
        accessibilityRole="button"
        onPress={onSwitch}
        style={styles.modeSwitch}
      >
        <Text style={styles.modeSwitchLabel}>Switch mode</Text>
      </Pressable>
    </View>
  );
}

function HarnessPage({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.page}>{children}</View>
    </SafeAreaView>
  );
}

function ModeButton({
  label,
  onPress,
}: Readonly<{ label: string; onPress: () => void }>) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.button}>
      <Text style={styles.buttonLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#111827" },
  page: { flex: 1, gap: 16, padding: 24, justifyContent: "center" },
  title: { color: "white", fontSize: 28, fontWeight: "700" },
  body: { color: "#CBD5E1", fontSize: 16, lineHeight: 24 },
  button: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#2563EB",
    paddingHorizontal: 18,
  },
  buttonLabel: { color: "white", fontSize: 17, fontWeight: "700" },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#1E293B",
    padding: 16,
  },
  cardTitle: { color: "white", fontSize: 17, fontWeight: "600" },
  kind: { color: "#93C5FD", fontSize: 13, marginTop: 6 },
  productContainer: { flex: 1 },
  modeSwitch: {
    position: "absolute",
    right: 12,
    top: 48,
    borderRadius: 999,
    backgroundColor: "#111827",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modeSwitchLabel: { color: "white", fontSize: 13, fontWeight: "700" },
});
