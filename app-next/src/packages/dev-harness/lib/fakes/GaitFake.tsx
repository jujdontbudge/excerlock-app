import { View } from 'react-native';
import type { PermissionStatus } from '../../../model/types';
import { GaitPort } from '../../../ports/GaitPort';
import { FixtureGaitVisionProvider } from './FixtureGaitVisionProvider';
import fixture from './real-walk-single.json';
import { Pictogram } from '../../../ui/Pictogram';
import { tokens as t } from '../../../ui/tokens';
import { permissionsStore } from '../../../permissions/permissionsStore';
export function GaitFake(preview = false, requestPermission?: () => Promise<PermissionStatus>): GaitPort & { set(value: 'none' | 'walking' | 'still'): void } {
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
      const answered = status === 'notDetermined' ? await requestPermission?.() ?? 'granted' : status;
      return answered === 'granted' ? 'granted' : 'denied';
    },
    start: async () => {
      if (!preview && permissionsStore.getState().data.camera === 'denied')
        throw Object.assign(new Error('Camera denied'), { code: 'ERR_GAIT_VISION_DENIED' });
      if (timer) clearInterval(timer);
      const start = Date.now(),
        first = fixture.samples[0].timestampMs;
      const provider = new FixtureGaitVisionProvider(
        fixture.samples.map((s) => ({ ...s, timestampMs: s.timestampMs - first })),
      );
      provider.onSample((sample) => {
        if (value === 'walking') listeners.forEach((cb) => cb({ ...sample, bodyAssociated: true, timestampMs: start + sample.timestampMs }));
        if (value === 'still') listeners.forEach((cb) => cb({
          ...sample,
          head: { x: 0.5, y: 0.3, height: 0.1, confidence: 1 },
          timestampMs: start + sample.timestampMs,
        }));
      });
      await provider.start();
      timer = setInterval(() => {
        provider.advanceTo(Date.now() - start);
        if (value === 'none') listeners.forEach((cb) => cb({ timestampMs: Date.now(), landmarks: {} }));
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
