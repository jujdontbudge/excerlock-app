import { applyGymDependency, GymPlaceRef } from '../../domain/gymDependency';
import { mergeSnapshot, RestoreSummary } from '../../domain/syncMerge';
import { DayKey } from '../../domain/types';
import { HistoryDay, Unsubscribe } from '../../ports/models';
import { SyncPort } from '../../ports/SyncPort';
import { profileStore } from '../../state/profileStore';
import { ruleDaysStore } from '../../state/ruleDaysStore';
import { rulesStore } from '../../state/rulesStore';
import { syncStore } from './syncStore';

/**
 * The persisted history rows (P2-T15's `historyStore`), reached through a bridge so this module does not
 * bind to a store that another task owns. Without one, history is neither restored nor pushed.
 */
export type HistoryBridge = {
  get(): HistoryDay[];
  set(rows: HistoryDay[]): void;
  subscribe(callback: () => void): Unsubscribe;
};

export type RestoreOutcome = { summary: RestoreSummary; localWasEmpty: boolean };

/**
 * Restore on a new device or after sign-in: pull the server snapshot, merge it under the conflict rule in
 * `domain/syncMerge`, and write the result back to the stores. The app selection is untouched, so Home
 * shows the no-apps state until the picker is used again. A restored gym rule with no saved gym on this
 * device pauses under the gym dependency instead of locking with nothing to detect.
 */
export async function restoreFromServer(input: {
  sync: SyncPort;
  today: DayKey;
  gymPlaces: GymPlaceRef[];
  history: HistoryBridge | null;
}): Promise<RestoreOutcome> {
  const remote = await input.sync.pull();
  const state = syncStore.getState().data;
  const rules = rulesStore.getState().data.rules;
  const { days, earnedUnlocks } = ruleDaysStore.getState().data;
  const merged = mergeSnapshot(
    {
      rules,
      tombstones: state.tombstones,
      ruleDays: days,
      earnedUnlocks,
      history: input.history?.get() ?? [],
      profile: profileStore.getState().data,
      profileUpdatedAt: state.profileUpdatedAt,
      clocks: state.clocks,
    },
    remote,
    input.today,
  );
  rulesStore.getState().patch({ rules: applyGymDependency(merged.rules, input.gymPlaces) });
  ruleDaysStore.getState().patch({ days: merged.ruleDays, earnedUnlocks: merged.earnedUnlocks });
  profileStore.getState().patch(merged.profile);
  input.history?.set(merged.history);
  syncStore.getState().patch({ clocks: merged.clocks, profileUpdatedAt: merged.profileUpdatedAt, restored: true });
  return { summary: merged.summary, localWasEmpty: rules.length === 0 };
}
