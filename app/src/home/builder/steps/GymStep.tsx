import { View } from "react-native";

import { MAX_SAVED_GYMS } from "@/signals";
import { SectionHeader, useTheme } from "@/ui";

import type { CatalogOption } from "../builderCatalog";
import { GymFinder } from "../components/GymFinder";
import { SavedGymRow } from "../components/SavedGymRow";
import type { GymSetup } from "../gymSetup";

/**
 * Builder step 2 for a gym condition: **which gym?** (#134). Setting a gym up
 * used to be a card under the condition list, which meant standing in the gym
 * to build the rule and finding the card at all; the question now lives where
 * the user came to answer it, and a gym saved here is picked straight away.
 *
 * Which saved gyms are still free is the picker's call, read off the entry's
 * source options — this step only renders those verdicts.
 */
export function GymStep({
  option,
  setup,
  selectedPlaceId,
  onPick,
}: {
  option: CatalogOption;
  /** Absent on a surface that only edits saved conditions (Manage). */
  setup?: GymSetup;
  selectedPlaceId?: string;
  onPick: (placeId: string) => void;
}) {
  const { spacing } = useTheme();
  const savedPlaces = setup?.savedPlaces ?? [];
  const full = savedPlaces.length >= MAX_SAVED_GYMS;

  return (
    <View style={{ gap: spacing.md }}>
      <SectionHeader
        title={
          savedPlaces.length === 0
            ? "Which gym?"
            : `Your gyms (${savedPlaces.length}/${MAX_SAVED_GYMS})`
        }
        subtitle={
          savedPlaces.length === 0
            ? "Search for it by name or address, or save the one you are standing in. We keep a 100 m circle on this phone."
            : "Pick one, or add another."
        }
      />

      {savedPlaces.map((place) => {
        const source = option.sources.find(({ placeId }) => placeId === place.id);
        return (
          <SavedGymRow
            key={place.id}
            place={place}
            selected={place.id === selectedPlaceId}
            selectable={source?.selectable ?? true}
            {...(source?.reason === undefined ? {} : { reason: source.reason })}
            onPick={() => onPick(place.id)}
            onRename={(name) => setup?.rename(place.id, name)}
            onRemove={() => setup?.remove(place.id)}
          />
        );
      })}

      {setup === undefined || full ? null : (
        <GymFinder setup={setup} onSaved={(place) => onPick(place.id)} />
      )}
    </View>
  );
}
