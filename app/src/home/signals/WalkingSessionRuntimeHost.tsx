import { useEffect } from "react";

import { useHomeStore } from "../store/homeStore";
import {
  getWalkingSessionController,
  type WalkingSessionController,
} from "./walkingSessionController";

export interface WalkingSessionRuntimeHostProps {
  readonly controller?: Pick<WalkingSessionController, "reconcileCondition">;
}

/** Stops a live session if its owning condition is disabled or removed. */
export function WalkingSessionRuntimeHost({
  controller = getWalkingSessionController(),
}: WalkingSessionRuntimeHostProps) {
  const conditions = useHomeStore((state) => state.conditions);
  const disabledConditionIds = useHomeStore(
    (state) => state.disabledConditionIds,
  );

  useEffect(() => {
    void controller.reconcileCondition();
  }, [conditions, controller, disabledConditionIds]);

  return null;
}
