import { useMemo, useState, type ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useURL } from "expo-linking";
import { HarnessApp } from "./HarnessApp";
import { createHarnessCameraRuntime } from "./HarnessCameraRuntime";
import { createDefaultHarnessSources } from "./createDefaultHarnessSources";

type BuildMode = "harness" | "product";

/**
 * A test build lands on the harness. There is deliberately no chooser: an
 * intermediate screen with two equally weighted buttons put the product one
 * mistaken tap away, which is the single thing this build exists to keep off
 * the phone. Reaching the product is still possible, but it is a demoted link
 * you have to mean.
 */
export function HarnessBuildRoot({
  productRuntime,
}: Readonly<{ productRuntime: ReactNode }>) {
  const [mode, setMode] = useState<BuildMode>("harness");

  if (mode === "product") {
    return (
      <View style={styles.productContainer}>
        {productRuntime}
        <Pressable
          accessibilityRole="button"
          onPress={() => setMode("harness")}
          style={styles.modeSwitch}
        >
          <Text style={styles.modeSwitchLabel}>Test harness</Text>
        </Pressable>
      </View>
    );
  }
  return <HarnessMode onSwitch={() => setMode("product")} />;
}

function HarnessMode({ onSwitch }: Readonly<{ onSwitch: () => void }>) {
  const camera = useMemo(createHarnessCameraRuntime, []);
  const sources = useMemo(
    () => ({ ...createDefaultHarnessSources(), camera: camera.source }),
    [camera],
  );
  // A launch url (excerlock://harness?test=…&start=1) opens and starts a task;
  // keying on it lets a second launch of the running app open a new task.
  const launchUrl = useURL();
  return (
    <View style={styles.productContainer}>
      <HarnessApp
        key={launchUrl ?? "no-launch-url"}
        launchUrl={launchUrl}
        CameraPreview={camera.Preview}
        footage={camera.capture}
        sources={sources}
      />
      <Pressable
        accessibilityRole="button"
        onPress={onSwitch}
        style={styles.escapeHatch}
      >
        <Text style={styles.escapeHatchLabel}>Real app</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
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
  escapeHatch: {
    position: "absolute",
    right: 12,
    bottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  escapeHatchLabel: {
    color: "#64748B",
    fontSize: 12,
    textDecorationLine: "underline",
  },
});
