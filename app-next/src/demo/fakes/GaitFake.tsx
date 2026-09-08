import { View } from 'react-native';
import { GaitPort } from '../../ports/GaitPort';
import { FixtureGaitVisionProvider } from '../../engine/signals/gait/FixtureGaitVisionProvider';
import fixture from '../../engine/signals/gait/fixtures/real-walk-single.json';
import { Icon } from '../../icons/Icon';
import { tokens as t } from '../../design-system/tokens';
import { permissionsStore } from '../../state/permissionsStore';
import { FakeContext } from '../FakeContext';
export function GaitFake(
  ctx: FakeContext | null,
  preview = false,
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
      // notDetermined is a real iOS prompt, so route it through the harness's
      // prompt mode like every other permission rather than assuming a yes.
      return status === 'notDetermined' && ctx ? ctx.request('camera') : status;
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
        <Icon name="walking" variant="utility" size={120} tint={t.brand.primary} />
      </View>
    ),
  };
}
