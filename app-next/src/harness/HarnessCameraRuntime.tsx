import Constants from "expo-constants";
import { Platform, View } from "react-native";
import type { ComponentType } from "react";
import {
  NativeGaitVisionProvider,
  type GaitVisionModuleClient,
} from "../engine/signals/gait";
import {
  shouldUseNativeIosRuntime,
  type NativeIosRuntimeEnvironment,
} from "../engine/nativeIosRuntime";
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

interface NativeHarnessCameraParts {
  readonly client: HarnessCaptureModuleClient;
  readonly Preview: ComponentType<GaitVisionPreviewProps>;
}

export type HarnessCameraRuntime = Readonly<{
  Preview: ComponentType<GaitVisionPreviewProps>;
  capture: HarnessFootageCapture;
  source: HarnessCameraSource;
}>;

/** Loads the same singleton camera module used by the production gait adapter. */
export function createHarnessCameraRuntime(
  environment: NativeIosRuntimeEnvironment = currentEnvironment(),
  loadNative: () => NativeHarnessCameraParts = loadNativeParts,
): HarnessCameraRuntime {
  if (!shouldUseNativeIosRuntime(environment)) {
    return unavailableRuntime();
  }
  let native: NativeHarnessCameraParts;
  try {
    native = loadNative();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return unavailableRuntime(`Camera unavailable: ${message}`);
  }
  const { client, Preview } = native;
  const capture: HarnessFootageCapture = {
    begin: (captureId) => client.beginHarnessCapture(captureId),
    end: () => client.endHarnessCapture(),
    deleteAll: () => client.deleteHarnessCaptures(),
  };
  return {
    Preview,
    capture,
    source: new HarnessCameraSource({
      capture,
      provider: new NativeGaitVisionProvider(client),
    }),
  };
}

function currentEnvironment(): NativeIosRuntimeEnvironment {
  return {
    nodeEnv: process.env.NODE_ENV,
    platform: Platform.OS,
    expoVersion: Constants.expoVersion,
  };
}

function loadNativeParts(): NativeHarnessCameraParts {
  const surface = require("../../modules/excerlock-gait-vision") as {
    getExcerlockGaitVisionModule(): HarnessCaptureModuleClient;
    getExcerlockGaitVisionPreview(): ComponentType<GaitVisionPreviewProps>;
  };
  return {
    client: surface.getExcerlockGaitVisionModule(),
    Preview: surface.getExcerlockGaitVisionPreview(),
  };
}

function unavailableRuntime(
  message = "Harness camera requires an iOS native build",
): HarnessCameraRuntime {
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
          throw new Error(message);
        },
        stop: async () => undefined,
        onSample: () => () => undefined,
      },
    }),
  };
}
