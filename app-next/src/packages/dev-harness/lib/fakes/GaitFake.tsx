import { View } from 'react-native';
import type { PermissionStatus } from '../../../model/types';
import { GaitPort } from '../../../ports/GaitPort';
import { Pictogram } from '../../../ui/Pictogram';
import { tokens as t } from '../../../ui/tokens';
import { permissionsStore } from '../../../permissions/permissionsStore';
export function GaitFake(
  preview = false,
  requestPermission?: () => Promise<PermissionStatus>,
): GaitPort & { set(value: 'none' | 'walking' | 'still'): void } {
  let value: 'none' | 'walking' | 'still' = 'none',
    timer: ReturnType<typeof setInterval> | undefined;
  const listeners = new Set<Parameters<GaitPort['onSample']>[0]>();
  return {
    set: (next) => {
      value = next;
    },
    permission: async () => {
      if (preview) return 'granted';
      const status = permissionsStore.getState().data.camera;
      const answered = status === 'notDetermined' ? ((await requestPermission?.()) ?? 'granted') : status;
      return answered === 'granted' ? 'granted' : 'denied';
    },
    start: async () => {
      if (!preview && permissionsStore.getState().data.camera === 'denied')
        throw Object.assign(new Error('Camera denied'), { code: 'ERR_GAIT_VISION_DENIED' });
      if (timer) clearInterval(timer);
      const start = Date.now();
      let seed = 7;
      const random = () => {
        seed = (seed * 1103515245 + 12345) % 2147483648;
        return seed / 2147483648;
      };
      const noise = () => Math.sqrt(-2 * Math.log(Math.max(random(), 1e-9))) * Math.cos(2 * Math.PI * random());
      timer = setInterval(() => {
        const timestampMs = Date.now(),
          elapsed = (timestampMs - start) / 1000;
        const y =
          0.42 +
          (value === 'walking'
            ? 0.02 * Math.sin(2 * Math.PI * 1.67 * elapsed)
            : 0.004 * Math.sin(elapsed * 1.57) + 0.003 * noise());
        listeners.forEach((cb) =>
          cb({
            timestampMs,
            landmarks: {},
            ...(value === 'none'
              ? {}
              : { head: { x: 0.5, y, height: value === 'walking' ? 0.2 : 0.16 + 0.003 * noise(), confidence: 0.9 } }),
          }),
        );
      }, 1000 / 15);
    },
    stop: async () => {
      if (timer) clearInterval(timer);
      timer = undefined;
    },
    onSample: (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    Preview: () => (
      <View
        accessible={false}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.surface.subtle }}>
        <Pictogram name="walking" variant="utility" />
      </View>
    ),
  };
}
