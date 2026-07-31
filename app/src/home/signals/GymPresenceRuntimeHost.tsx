import { useEffect } from "react";

import { useSettingsStore } from "@/settings";

import { useHomeStore } from "../store/homeStore";
import {
  getGymPresenceController,
  type GymPresenceController,
} from "./gymPresenceController";

export interface GymPresenceRuntimeHostProps {
  readonly controller?: Pick<GymPresenceController, "reconcileAutoDetect">;
}

/** App-lifetime reconciliation for an auto-detect choice already made by hand. */
export function GymPresenceRuntimeHost({
  controller = getGymPresenceController(),
}: GymPresenceRuntimeHostProps) {
  const autoDetectEnabled = useSettingsStore(
    (state) => state.gymAutoDetectEnabled,
  );
  const conditions = useHomeStore((state) => state.conditions);
  const disabledConditionIds = useHomeStore(
    (state) => state.disabledConditionIds,
  );
  const savedPlaces = useHomeStore((state) => state.savedPlaces);

  useEffect(() => {
    void controller.reconcileAutoDetect();
  }, [
    autoDetectEnabled,
    conditions,
    controller,
    disabledConditionIds,
    savedPlaces,
  ]);

  return null;
}
