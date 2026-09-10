import { ExportPayload, ExportVisit } from '../../ports/ExportPort';
import { profileStore } from '../../state/profileStore';
import { ruleDaysStore } from '../../state/ruleDaysStore';
import { rulesStore } from '../../state/rulesStore';
import { createAsyncStorageGymVisitLog } from '../../engine/signals/location';

export async function buildExportPayload(exportedAt: string, visits?: ExportVisit[]): Promise<ExportPayload> {
  const days = ruleDaysStore.getState().data.days;
  const confirmedVisits = visits ?? [...await createAsyncStorageGymVisitLog().readAll()];
  return {
    exportedAt,
    rules: rulesStore.getState().data.rules,
    days,
    earnedUnlocks: days.filter((day) => day.met).map((day) => ({
      ruleId: day.ruleId,
      day: day.day,
      earnedAt: day.metAt,
    })),
    visits: confirmedVisits,
    profile: profileStore.getState().data,
  };
}
