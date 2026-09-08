import {
  NativeMotionProvider,
  NativePhonePlacementProvider,
  createExcerlockMotionModuleClient,
  createPhonePlacementModuleClient,
} from "../engine/signals";
import type {
  HarnessSignalSource,
  HarnessSignalSourceId,
} from "./HarnessRunEngine";
import { MotionHarnessSource } from "./sources/MotionHarnessSource";
import { PlacementHarnessSignalSource } from "./PlacementHarnessSignalSource";

/** Physical-device composition; adapters retain the production signal seams. */
export function createDefaultHarnessSources(): Partial<
  Record<HarnessSignalSourceId, HarnessSignalSource>
> {
  return {
    motion: new MotionHarnessSource(
      () => new NativeMotionProvider(createExcerlockMotionModuleClient()),
    ),
    placement: new PlacementHarnessSignalSource(
      () => new NativePhonePlacementProvider(createPhonePlacementModuleClient()),
    ),
  };
}
