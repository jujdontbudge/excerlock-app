import { useState } from "react";
import { Text, TextInput, View } from "react-native";

import { GYM_RADIUS_METERS, MAX_SAVED_GYMS, type LocationSample } from "@/signals";
import { PillButton, SectionHeader, useTheme } from "@/ui";

import type { SavedPlace } from "../../store/homeState";

/**
 * How a gym gets onto the phone: the user names it while standing in it and
 * takes one location fix. The saved circle (100 m default) is what manual
 * check-in and auto-detect both compare against. Coordinates stay on device.
 */
export function SaveGymCard({
  savedPlaces,
  locate,
  onSave,
  createId = () => `place-${Date.now()}`,
}: {
  savedPlaces: readonly SavedPlace[];
  /** One foreground fix; rejects when permission is refused or no fix arrives. */
  locate: () => Promise<LocationSample>;
  onSave: (place: SavedPlace) => void;
  createId?: () => string;
}) {
  const { colors, radius, spacing, typography } = useTheme();
  const [name, setName] = useState("");
  const [status, setStatus] = useState<
    { kind: "idle" } | { kind: "locating" } | { kind: "error"; message: string }
  >({ kind: "idle" });
  const full = savedPlaces.length >= MAX_SAVED_GYMS;
  const trimmed = name.trim();

  const save = async () => {
    setStatus({ kind: "locating" });
    try {
      const sample = await locate();
      onSave({
        id: createId(),
        name: trimmed,
        geofence: {
          latitude: sample.lat,
          longitude: sample.lon,
          radiusMeters: GYM_RADIUS_METERS.default,
        },
      });
      setName("");
      setStatus({ kind: "idle" });
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: radius.md,
        gap: spacing.md,
        padding: spacing.gutter,
      }}
    >
      <SectionHeader
        title={savedPlaces.length === 0 ? "Save your gym" : `Your gyms (${savedPlaces.length}/${MAX_SAVED_GYMS})`}
        subtitle="Stand inside the gym, name it, and save your location. Gym conditions unlock once one is saved."
      />
      {savedPlaces.map((place) => (
        <Text key={place.id} style={typography.body}>
          {place.name}
        </Text>
      ))}
      {full ? null : (
        <>
          <TextInput
            accessibilityLabel="Gym name"
            autoCapitalize="words"
            autoCorrect={false}
            onChangeText={setName}
            placeholder="Gym name"
            placeholderTextColor={colors.textTertiary}
            style={[
              typography.body,
              {
                backgroundColor: colors.pillSecondary,
                borderRadius: radius.sm,
                color: colors.textPrimary,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.md,
              },
            ]}
            value={name}
          />
          <PillButton
            label={status.kind === "locating" ? "Finding your location…" : "Save my current location"}
            variant="white"
            disabled={trimmed.length === 0 || status.kind === "locating"}
            onPress={() => void save()}
          />
          {status.kind === "error" ? (
            <Text style={[typography.caption, { color: colors.danger }]}>
              {`Could not save: ${status.message}`}
            </Text>
          ) : null}
        </>
      )}
    </View>
  );
}
