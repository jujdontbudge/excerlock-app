import { createScreenTimeAdapter, ScreenTimeAdapter } from '../adapters/screentime/ScreenTimeAdapter';
import { screenTimeStoreBindings } from '../adapters/screentime/storeBindings';
import { createNativeScreenTimeModule } from '../engine/screentime/native/createNativeScreenTimeModule';
import { deviceActivityApi } from '../engine/screentime/native/deviceActivityApi';
import { ClockPort } from '../ports/ClockPort';

/**
 * The real Screen Time port: the adapter over the ported native engine, with the store bindings
 * screens read the selection and the permission from.
 *
 * `null` means the DeviceActivity module is not there to talk to, which is every simulator and
 * every Expo Go build. The caller keeps the fake in that case, exactly as it does for gait.
 */
export function nativeScreenTime(clock: ClockPort): ScreenTimeAdapter | null {
  try {
    return createScreenTimeAdapter({
      module: createNativeScreenTimeModule(),
      deviceActivity: deviceActivityApi,
      clock: { now: () => clock.now(), timezone: () => clock.timezone() },
      ...screenTimeStoreBindings,
    });
  } catch {
    return null;
  }
}
