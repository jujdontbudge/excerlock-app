import { GymPresenceRuntimeHost } from "./GymPresenceRuntimeHost";
import { WalkingSessionRuntimeHost } from "./WalkingSessionRuntimeHost";

/** App-lifetime signal reconciliation, mounted after build-specific fixtures. */
export function SignalRuntimeHosts() {
  return (
    <>
      <GymPresenceRuntimeHost />
      <WalkingSessionRuntimeHost />
    </>
  );
}
