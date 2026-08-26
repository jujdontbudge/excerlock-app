import { Redirect } from "expo-router";

import { DiagnosticsScreen, isDiagnosticsEnabled } from "@/diagnostics";

/** Present only in builds that opted in; anything else routes home. */
export default function DiagnosticsRoute() {
  return isDiagnosticsEnabled() ? <DiagnosticsScreen /> : <Redirect href="/" />;
}
