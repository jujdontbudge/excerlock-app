import { NativeScreenTimeModule } from '../../../engine/screentime/native/NativeScreenTimeModule';
import { NATIVE_LOCKED_SELECTION } from '../../../engine/screentime/native/nativeSelection';
import { LockedApps } from '../../../domain/types';
import { createScreenTimeAdapter, ScreenTimeAdapter, ShieldCopySource } from '../ScreenTimeAdapter';
import { deviceActivityDouble, memoryStorage } from './DeviceActivityDouble';

type Counts = { applicationCount: number; categoryCount: number };

/**
 * The adapter over the real ported engine, with only the DeviceActivity package doubled. Every
 * test below therefore exercises `ScreenTimeAdapter`, `NativeScreenTimeModule` and
 * `NativeShieldScheduler` together, which is the whole path from a decision to an OS call.
 */
export async function screenTimeSubject(
  options: {
    now?: string;
    timezone?: string;
    authorization?: 0 | 1 | 2;
    /** Counts the system picker returns; `null` is a cancelled sheet. */
    pick?: Counts | null;
    /** Skip seeding a chosen selection into the module, as on a first launch. */
    withoutSelection?: boolean;
    /**
     * What the OS itself still holds, independent of what this process picked. Defaults to a
     * selection, and to none when nothing was ever picked. Set both to model a cold start: the
     * user's selection survives in the OS, the module's memory of it does not.
     */
    osSelection?: Counts | null;
    copy?: ShieldCopySource;
  } = {},
) {
  const now = options.now ?? '2026-09-08T01:30:00.000Z';
  const timezone = options.timezone ?? 'America/New_York';
  const osSelection =
    options.osSelection !== undefined ? options.osSelection : options.withoutSelection ? null : undefined;
  const native = deviceActivityDouble({
    authorization: options.authorization ?? 2,
    ...(osSelection !== undefined ? { selection: osSelection } : {}),
  });
  let picked: Counts | null = { applicationCount: 4, categoryCount: 2 };
  const selections: LockedApps[] = [];
  const module = new NativeScreenTimeModule({
    deviceActivity: native.api,
    picker: {
      // Completing the sheet is what puts the selection in the OS, so the double learns it too:
      // otherwise a freshly picked selection would read back as none on the next launch.
      pick: async () => {
        // Cancelling leaves the stored selection alone; only a completed sheet replaces it.
        if (picked !== null) native.setSelection(picked);
        return picked;
      },
    },
    nowMs: () => Date.parse(now),
    storage: memoryStorage(),
  });
  if (!options.withoutSelection) {
    await module.pickSelection();
    native.reset();
  }
  // Seeding uses the default counts, so a test can then make the sheet return anything.
  if (options.pick !== undefined) picked = options.pick;
  const adapter: ScreenTimeAdapter = createScreenTimeAdapter({
    module,
    deviceActivity: native.api,
    clock: { now: () => now, timezone: () => timezone },
    copy: options.copy ?? (() => ({ rules: [], ruleDays: [], canNotify: true })),
    onSelection: (selection) => void selections.push(selection),
  });
  return { native, module, adapter, selections, handle: NATIVE_LOCKED_SELECTION };
}
