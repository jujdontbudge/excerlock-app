import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import type { GymSearchResult } from "@/signals";
import { PillButton, useTheme } from "@/ui";

import type { SavedPlace } from "../../store/homeState";
import { gymFromSample, gymFromSearchResult, type GymSetup } from "../gymSetup";

type Status =
  | { readonly kind: "idle" }
  | { readonly kind: "searching" }
  | { readonly kind: "locating" }
  | { readonly kind: "results"; readonly query: string; readonly results: readonly GymSearchResult[] }
  | { readonly kind: "error"; readonly text: string };

/**
 * The half of the gym step that adds a gym: search it by name or address, or
 * take the fix under the user's feet. Both land in the same 100 m circle
 * (`gymSetup`), which is the only shape a gym is ever saved in.
 *
 * Search is the default because most people build their rules at home (#134);
 * the current-location fix is one option among them, not the only door.
 */
export function GymFinder({
  setup,
  onSaved,
}: {
  setup: GymSetup;
  /** The saved gym, so the step can pick it without a second tap. */
  onSaved: (place: SavedPlace) => void;
}) {
  const { colors, radius, spacing, typography } = useTheme();
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const createId = setup.createId ?? (() => `place-${Date.now()}`);
  const inputStyle = [
    typography.body,
    {
      backgroundColor: colors.pillSecondary,
      borderRadius: radius.sm,
      color: colors.textPrimary,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
  ];

  const save = (place: SavedPlace) => {
    setup.save(place);
    setName("");
    setQuery("");
    setStatus({ kind: "idle" });
    onSaved(place);
  };

  const runSearch = async () => {
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      return;
    }
    setStatus({ kind: "searching" });
    try {
      setStatus({ kind: "results", query: trimmed, results: await setup.search(trimmed) });
    } catch (error) {
      setStatus({ kind: "error", text: `Could not search: ${message(error)}` });
    }
  };

  const saveHere = async () => {
    if (name.trim().length === 0) {
      return;
    }
    setStatus({ kind: "locating" });
    try {
      save(gymFromSample(createId(), name, await setup.locate()));
    } catch (error) {
      setStatus({ kind: "error", text: `Could not save: ${message(error)}` });
    }
  };

  return (
    <View style={{ gap: spacing.md }}>
      <TextInput
        accessibilityLabel="Gym name"
        autoCapitalize="words"
        autoCorrect={false}
        onChangeText={setName}
        placeholder="Name it (optional for a search result)"
        placeholderTextColor={colors.textTertiary}
        style={inputStyle}
        value={name}
      />

      <View style={[styles.searchRow, { gap: spacing.sm }]}>
        <TextInput
          accessibilityLabel="Search for a gym"
          autoCapitalize="words"
          autoCorrect={false}
          onChangeText={setQuery}
          onSubmitEditing={() => void runSearch()}
          placeholder="Gym name or address"
          placeholderTextColor={colors.textTertiary}
          returnKeyType="search"
          style={[inputStyle, styles.searchInput]}
          value={query}
        />
        <PillButton
          label={status.kind === "searching" ? "Searching…" : "Search"}
          variant="secondary"
          disabled={query.trim().length === 0 || status.kind === "searching"}
          onPress={() => void runSearch()}
        />
      </View>

      {status.kind === "results" ? (
        status.results.length === 0 ? (
          <Text style={[typography.caption, { color: colors.textTertiary }]}>
            {`No gyms found for "${status.query}".`}
          </Text>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {status.results.map((result) => (
              <Pressable
                key={result.id}
                accessibilityRole="button"
                accessibilityLabel={result.name}
                onPress={() => save(gymFromSearchResult(createId(), name, result))}
                style={{
                  backgroundColor: colors.card,
                  borderRadius: radius.md,
                  gap: spacing.xs,
                  padding: spacing.gutter,
                }}
              >
                <Text style={typography.cardTitle}>{result.name}</Text>
                {result.address.length === 0 ? null : (
                  <Text style={[typography.caption, { color: colors.textTertiary }]}>
                    {result.address}
                  </Text>
                )}
              </Pressable>
            ))}
          </View>
        )
      ) : null}

      <PillButton
        label={status.kind === "locating" ? "Finding your location…" : "Use my current location"}
        variant="white"
        disabled={name.trim().length === 0 || status.kind === "locating"}
        onPress={() => void saveHere()}
      />

      {status.kind === "error" ? (
        <Text style={[typography.caption, { color: colors.danger }]}>{status.text}</Text>
      ) : null}
    </View>
  );
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const styles = StyleSheet.create({
  searchInput: { flex: 1 },
  searchRow: { alignItems: "center", flexDirection: "row" },
});
