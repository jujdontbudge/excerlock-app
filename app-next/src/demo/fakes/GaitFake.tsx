import { View } from 'react-native';
import { GaitPort } from '../../ports/GaitPort';
import { FixtureGaitVisionProvider } from '../../features/unlock/gait/FixtureGaitVisionProvider';
import fixture from '../../features/unlock/gait/real-walk-single.json';
import { Pictogram } from '../../design-system/Pictogram';
import { tokens as t } from '../../design-system/tokens';
import { permissionsStore } from '../../state/permissionsStore';
export function GaitFake(preview = false): GaitPort & { set(value: 'none' | 'walking' | 'still'): void } {
  let value: 'none' | 'walking' | 'still' = 'none',
    timer: ReturnType<typeof setInterval> | undefined;
  const listeners = new Set<Parameters<GaitPort['onSample']>[0]>();
  return {
    set: (next) => {
      value = next;
    },
    permission: async () => (!preview && permissionsStore.getState().data.camera === 'denied' ? 'denied' : 'granted'),
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
        if (value === 'walking') listeners.forEach((cb) => cb({ ...sample, timestampMs: start + sample.timestampMs }));
      });
      await provider.start();
      timer = setInterval(() => {
        provider.advanceTo(Date.now() - start);
        if (value !== 'walking') listeners.forEach((cb) => cb({ timestampMs: Date.now(), landmarks: {} }));
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
        <Pictogram name="walking" variant="utility" tint={t.brand.primary} />
      </View>
    ),
  };
}
