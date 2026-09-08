import { requireOptionalNativeModule } from 'expo';
import { GaitPort } from '../ports/GaitPort';
import { getExcerlockGaitVisionPreview } from '../../modules/excerlock-gait-vision';
import { GaitKeypointSample } from '../features/unlock/gait/GaitVisionProvider';
type NativeGaitModule = {
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
    // merge: P2-T03 replaces this probe with a real AVCaptureDevice
    // authorization read. Starting and stopping the camera to learn the answer
    // flashes the preview before the ceremony asks for it, and it can only ever
    // say granted or denied — never notDetermined or restricted.
    permission: async () => {
      try {
        await module.start();
        await module.stop();
        return 'granted';
      } catch {
        return 'denied';
      }
    },
    Preview: () => <Preview active style={{ flex: 1 }} />,
  };
}
