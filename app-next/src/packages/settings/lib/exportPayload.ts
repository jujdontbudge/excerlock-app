import type { ExportPayload } from '../../ports/ExportPort';
import { rulesStore } from '../../conditions/rulesStore';
import { ruleDaysStore } from '../../conditions/ruleDaysStore';
import { profileStore } from '../../preferences/profileStore';
import { AsyncStorageGymVisitLog } from '../../activity/AsyncStorageGymVisitLog';

export async function buildExportPayload(exportedAt: string): Promise<ExportPayload> {
  const days = ruleDaysStore.getState().data.days;
  return {
    exportedAt,
    rules: rulesStore.getState().data.rules,
    days,
    earnedUnlocks: days.filter((day) => day.met).map((day) => ({
      ruleId: day.ruleId,
      day: day.day,
      earnedAt: day.metAt,
    })),
    visits: [...await new AsyncStorageGymVisitLog().readAll()],
    profile: profileStore.getState().data,
  };
}
