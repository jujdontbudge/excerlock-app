import type { GymTransitionRecord, GymVisitLog } from './GymVisitLog';
import type { RegionTransition } from './LocationProvider';
type Options = {
  readonly log: GymVisitLog;
  readonly onPresence: (transition: RegionTransition) => void;
  readonly onTransition: (transition: RegionTransition) => void;
  readonly now?: () => number;
};
export class GeofenceEventProcessor {
  private rawPresence = new Map<string, boolean>();
  constructor(private readonly options: Options) {}
  async process(transition: RegionTransition): Promise<void> {
    const receivedAtMs = this.options.now?.() ?? Date.now();
    const record: GymTransitionRecord = {
      id: `${transition.regionId}:${transition.type}:${transition.atMs}`,
      regionId: transition.regionId,
      type: transition.type,
      atMs: transition.atMs,
      receivedAtMs,
    };
    await this.options.log.append(record, transition.manualEpoch);
    this.rawPresence.set(transition.regionId, transition.type === 'enter');
    this.options.onPresence(transition);
    this.options.onTransition(transition);
  }
  isInside(regionId: string): boolean | null {
    return this.rawPresence.get(regionId) ?? null;
  }
}
