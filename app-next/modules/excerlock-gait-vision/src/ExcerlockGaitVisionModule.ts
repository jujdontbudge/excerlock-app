import { NativeModule, requireNativeModule } from "expo";

import type { ExcerlockGaitVisionModuleEvents } from "./ExcerlockGaitVision.types";

export type GaitCameraAuthorization =
  | "notDetermined"
  | "granted"
  | "denied"
  | "restricted";

export class ExcerlockGaitVisionModule extends NativeModule<ExcerlockGaitVisionModuleEvents> {
  /** Reads AVCaptureDevice.authorizationStatus; never touches the session. */
  public cameraAuthorization!: () => GaitCameraAuthorization;
  public requestCameraAccess!: () => Promise<boolean>;
  public start!: () => Promise<void>;
  public stop!: () => Promise<void>;
  public beginHarnessCapture!: (captureId: string) => Promise<string>;
  public endHarnessCapture!: () => Promise<void>;
  public deleteHarnessCaptures!: () => Promise<void>;
}

export default requireNativeModule<ExcerlockGaitVisionModule>(
  "ExcerlockGaitVision",
);
