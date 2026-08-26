import { useCallback, useSyncExternalStore } from "react";
import { FlatList, Share, Text, View } from "react-native";

import { PillButton, Screen, useTheme } from "@/ui";

import { getDiagnosticsLog } from "./accessor";
import type { DiagnosticsEntry, DiagnosticsLog } from "./DiagnosticsLog";

/**
 * The whole reason this exists is that device testing happens with no Mac in
 * reach: on a treadmill, on a gym trip, on a walk with no Wi-Fi. A log you can
 * only read through Metro is a log you cannot read when it matters.
 */
export function DiagnosticsScreen({
  log = getDiagnosticsLog(),
}: {
  log?: DiagnosticsLog;
}) {
  const { colors, spacing, typography } = useTheme();
  const entries = useSyncExternalStore(
    useCallback((listener: () => void) => log.subscribe(listener), [log]),
    useCallback(() => log.entries(), [log]),
  );

  const newestFirst = [...entries].reverse();

  return (
    <Screen edges={["top", "right", "bottom", "left"]}>
      <View style={{ flex: 1, gap: spacing.md, padding: spacing.gutter }}>
        <View style={{ gap: spacing.sm }}>
          <Text accessibilityRole="header" style={typography.title}>
            Diagnostics
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            {`${entries.length} recorded ${entries.length === 1 ? "event" : "events"}, newest first.`}
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <PillButton
            label="Share log"
            onPress={() => {
              void Share.share({ message: log.toText() });
            }}
            variant="white"
          />
          <PillButton
            label="Clear"
            onPress={() => {
              void log.clear();
            }}
            variant="secondary"
          />
        </View>

        {entries.length === 0 ? (
          <Text style={typography.body}>
            Nothing recorded yet. Start a walk session and come back.
          </Text>
        ) : (
          <FlatList
            data={newestFirst}
            keyExtractor={(entry, index) => `${entry.atMs}-${index}`}
            renderItem={({ item }) => (
              <DiagnosticsRow entry={item} />
            )}
          />
        )}
      </View>
    </Screen>
  );
}

function DiagnosticsRow({ entry }: { entry: DiagnosticsEntry }) {
  const { colors, spacing, typography } = useTheme();
  const detail = JSON.stringify(entry.data);

  return (
    <View style={{ gap: 2, paddingVertical: spacing.xs }}>
      <Text style={[typography.cardTitle, { color: colors.textPrimary }]}>
        {`${formatClock(entry.atMs)}  ${entry.event}`}
      </Text>
      {detail === "{}" ? null : (
        <Text style={[typography.caption, { color: colors.textSecondary }]}>
          {detail}
        </Text>
      )}
    </View>
  );
}

function formatClock(atMs: number): string {
  const date = new Date(atMs);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
