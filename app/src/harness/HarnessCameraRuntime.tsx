import Constants from "expo-constants";
import { Platform, View } from "react-native";
import type { ComponentType } from "react";
import {
  NativeGaitVisionProvider,
  type GaitVisionModuleClient,
} from "@/signals/gait";
import type { GaitVisionPreviewProps } from "../../modules/excerlock-gait-vision";
import {
  HarnessCameraSource,
  type HarnessFootageCapture,
} from "./HarnessCameraSource";

interface HarnessCaptureModuleClient extends GaitVisionModuleClient {
  beginHarnessCapture(captureId: string): Promise<string>;
  endHarnessCapture(): Promise<void>;
  deleteHarnessCaptures(): Promise<void>;
}

export type HarnessCameraRuntime = Readonly<{
  Preview: ComponentType<GaitVisionPreviewProps>;
  capture: HarnessFootageCapture;
  source: HarnessCameraSource;
}>;

/** Loads the same singleton camera module used by the production gait adapter. */
export function createHarnessCameraRuntime(): HarnessCameraRuntime {
  if (
    process.env.NODE_ENV === "test" ||
    Platform.OS !== "ios" ||
    Constants.expoGoConfig !== null
  ) {
    return unavailableRuntime();
  }
  const surface = require("../../modules/excerlock-gait-vision") as {
    getExcerlockGaitVisionModule(): HarnessCaptureModuleClient;
    getExcerlockGaitVisionPreview(): ComponentType<GaitVisionPreviewProps>;
  };
  const client = surface.getExcerlockGaitVisionModule();
  const capture: HarnessFootageCapture = {
    begin: (captureId) => client.beginHarnessCapture(captureId),
    end: () => client.endHarnessCapture(),
    deleteAll: () => client.deleteHarnessCaptures(),
  };
  return {
    Preview: surface.getExcerlockGaitVisionPreview(),
    capture,
    source: new HarnessCameraSource({
      capture,
      provider: new NativeGaitVisionProvider(client),
    }),
  };
}

function unavailableRuntime(): HarnessCameraRuntime {
  const capture: HarnessFootageCapture = {
    begin: async () => undefined,
    end: async () => undefined,
    deleteAll: async () => undefined,
  };
  return {
    Preview: ({ style }) => <View style={style} />,
    capture,
    source: new HarnessCameraSource({
      capture,
      provider: {
        start: async () => {
          throw new Error("Harness camera requires an iOS development build");
        },
        stop: async () => undefined,
        onSample: () => () => undefined,
      },
    }),
  };
}
