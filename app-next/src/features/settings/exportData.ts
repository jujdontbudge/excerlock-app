import { buildDataExport, dataExportFileName, dataExportJson } from '../../domain/dataExport';
import { historyFromRuleDays } from '../analytics/history';
import { Runtime } from '../../runtime/Runtime';
import { ruleDaysStore } from '../../state/ruleDaysStore';
import { rulesStore } from '../../state/rulesStore';
import { sessionStore } from '../../state/sessionStore';
import { settingsStore } from '../../state/settingsStore';
import { ExportSink, nativeExportSink } from './nativeExport';

/**
 * Export my data: builds the documented JSON from the local stores, records the request, writes the
 * file and opens the share sheet. Local-first like everything else: no server call is involved.
 */
export async function exportUserData(
  runtime: Pick<Runtime, 'clock' | 'analytics'>,
  sink: ExportSink = nativeExportSink,
): Promise<void> {
  const { rules } = rulesStore.getState().data;
  const { days, earnedUnlocks } = ruleDaysStore.getState().data;
  const data = buildDataExport({
    exportedAt: runtime.clock.now(),
    userId: sessionStore.getState().data.session.userId,
    units: settingsStore.getState().data.units,
    rules,
    ruleDays: days,
    earnedUnlocks,
    history: historyFromRuleDays(days, rules),
  });
  runtime.analytics.track('data_export_requested');
  const url = await sink.writeFile(dataExportFileName(data.exportedAt), dataExportJson(data));
  await sink.share(url);
}
