import {
  NativeMotionProvider,
  createExcerlockMotionModuleClient,
} from "@/signals";
import type {
  HarnessSignalSource,
  HarnessSignalSourceId,
} from "./HarnessRunEngine";
import { MotionHarnessSource } from "./sources/MotionHarnessSource";

/** Physical-device composition; adapters retain the production signal seams. */
export function createDefaultHarnessSources(): Partial<
  Record<HarnessSignalSourceId, HarnessSignalSource>
> {
  return {
    motion: new MotionHarnessSource(
      () => new NativeMotionProvider(createExcerlockMotionModuleClient()),
    ),
  };
}
