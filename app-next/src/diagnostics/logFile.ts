import { DiagnosticsLog } from './DiagnosticsLog';

/**
 * Where the device runbook looks. `xcrun devicectl device copy from` can reach anything under the
 * app's Documents directory, so the log is pullable over the cable with no share sheet and no Mac
 * on the same network — which is the point, because device testing happens away from the desk.
 */
export const DIAGNOSTICS_FILE = 'diagnostics/latest.log';

/** The one thing this module needs from the file system, so a test never touches a real one. */
export type DiagnosticsFileSink = { write(path: string, contents: string): Promise<void> };

/**
 * Mirrors the log into a file every time it is persisted.
 *
 * `append` is not the moment to write: it runs inside pedometer and geofence callbacks, thousands of
 * times a session. `flush` and `clear` are already the points where the whole buffer is written
 * down, so the copy rides along with them. A clear writes an empty file rather than leaving the last
 * session's text behind, because the runbook clears between scenarios and a stale log would be read
 * as this scenario's evidence.
 */
export function mirrorToFile(log: DiagnosticsLog, sink: DiagnosticsFileSink): () => void {
  return log.onPersist(async (text) => {
    await sink.write(DIAGNOSTICS_FILE, text);
  });
}
