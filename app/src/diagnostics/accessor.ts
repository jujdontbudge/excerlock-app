import { DiagnosticsLog, type DiagnosticsStorage } from "./DiagnosticsLog";

let log: DiagnosticsLog | undefined;

/**
 * Off unless a build explicitly asks for it. Device-test builds set
 * `EXPO_PUBLIC_DIAGNOSTICS=1`; App Store builds never do, so the recorder and
 * its screen cost a shipped app nothing.
 */
export function isDiagnosticsEnabled(): boolean {
  return process.env.EXPO_PUBLIC_DIAGNOSTICS === "1";
}

export function getDiagnosticsLog(): DiagnosticsLog {
  log ??= new DiagnosticsLog({
    storage: loadStorage(),
    now: () => Date.now(),
  });
  return log;
}

/**
 * Required lazily so a build with diagnostics off never pulls AsyncStorage into
 * its module graph -- the root layout imports this file unconditionally.
 */
function loadStorage(): DiagnosticsStorage {
  const { default: AsyncStorage } = require(
    "@react-native-async-storage/async-storage",
  ) as typeof import("@react-native-async-storage/async-storage");
  return AsyncStorage as DiagnosticsStorage;
}

/** Composition-root injection for tests and scenario builds. */
export function installDiagnosticsLog(replacement: DiagnosticsLog): () => void {
  const previous = log;
  log = replacement;
  return () => {
    if (log === replacement) {
      log = previous;
    }
  };
}
