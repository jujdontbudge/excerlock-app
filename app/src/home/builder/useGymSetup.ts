import { useMemo } from "react";

import { getGymSearchClient, getLocationProvider } from "@/signals";

import type { GymSetup } from "./gymSetup";
import { useHomeStore } from "../store/homeStore";

/**
 * The gym step's seam, wired to the store and the two location boundaries. It
 * lives here rather than in the screen so every surface that opens the builder
 * gets the same setup, and so `GymSetup` stays the only thing the step knows.
 */
export function useGymSetup(): GymSetup {
  const savedPlaces = useHomeStore((state) => state.savedPlaces);
  const save = useHomeStore((state) => state.addSavedPlace);
  const rename = useHomeStore((state) => state.renameSavedPlace);
  const remove = useHomeStore((state) => state.removeSavedPlace);

  return useMemo(
    () => ({
      savedPlaces,
      locate: () => getLocationProvider().locateForGymSetup(),
      search: (query: string) => getGymSearchClient().search(query),
      save,
      rename,
      remove,
    }),
    [savedPlaces, save, rename, remove],
  );
}
