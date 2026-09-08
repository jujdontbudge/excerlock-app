import { DiagnosticsFileSink } from './logFile';

/**
 * The device side of the diagnostics mirror: a file under the app's Documents directory.
 *
 * `expo-file-system` is required lazily for the reason the whole recorder is optional — a build with
 * diagnostics off never pulls it in. `settings/nativeExport.ts` is the other file that touches the
 * package; both keep it behind one small object so nothing else in the app knows a file system
 * exists.
 */
export function nativeDiagnosticsSink(): DiagnosticsFileSink {
  return {
    async write(path, contents) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { File, Paths } = require('expo-file-system') as typeof import('expo-file-system');
      const file = new File(Paths.document, path);
      file.create({ overwrite: true, intermediates: true });
      file.write(contents);
    },
  };
}
