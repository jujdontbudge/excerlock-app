import {
  NativePhonePlacementProvider,
  createPhonePlacementModuleClient,
} from "@/signals/placement";
import type {
  HarnessSignalSource,
  HarnessSignalSourceId,
} from "./HarnessRunEngine";
import { PlacementHarnessSignalSource } from "./PlacementHarnessSignalSource";

export function createDefaultHarnessSignalSources(): Partial<
  Record<HarnessSignalSourceId, HarnessSignalSource>
> {
  return {
    placement: new PlacementHarnessSignalSource(
      new NativePhonePlacementProvider(createPhonePlacementModuleClient()),
    ),
  };
}
