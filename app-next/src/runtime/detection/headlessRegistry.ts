import type { RegionTransition } from '../../engine/signals/location/LocationProvider';
type Handler = (transition: RegionTransition) => Promise<void>;
let handler: Handler | null = null;
export function registerHeadlessDetectionHandler(next: Handler): () => void {
  handler = next;
  return () => {
    if (handler === next) handler = null;
  };
}
export async function reconcilePersistedGeofenceEvent(transition: RegionTransition): Promise<void> {
  await handler?.(transition);
}
