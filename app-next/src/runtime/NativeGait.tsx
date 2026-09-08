import { requireOptionalNativeModule } from 'expo';
import { GaitPort } from '../ports/GaitPort';
import { PermissionStatus } from '../domain/types';
import { getExcerlockGaitVisionPreview } from '../../modules/excerlock-gait-vision';
import { GaitKeypointSample } from '../engine/signals/gait/GaitVisionProvider';
type NativeGaitModule = {
  cameraAuthorization(): PermissionStatus;
  requestCameraAccess(): Promise<boolean>;
  start(): Promise<void>;
  stop(): Promise<void>;
  addListener(name: string, cb: (sample: GaitKeypointSample) => void): { remove(): void };
};
export function nativeGait(): GaitPort | null {
  const module = requireOptionalNativeModule<NativeGaitModule>('ExcerlockGaitVision');
  if (!module) return null;
  const Preview = getExcerlockGaitVisionPreview();
  return {
    start: () => module.start(),
    stop: () => module.stop(),
    onSample: (cb) => {
      const subscription = module.addListener('onGaitSample', cb);
      return () => subscription.remove();
    },
    // The ceremony asks before every scan, so this reads
    // AVCaptureDevice.authorizationStatus rather than probing the session:
    // start/stop flashed the preview and could only ever answer granted or
    // denied. notDetermined prompts once; restricted is honoured, not softened.
    permission: async () => {
      const status = module.cameraAuthorization();
      if (status !== 'notDetermined') return status;
      return (await module.requestCameraAccess()) ? 'granted' : 'denied';
    },
    Preview: () => <Preview active style={{ flex: 1 }} />,
  };
}
