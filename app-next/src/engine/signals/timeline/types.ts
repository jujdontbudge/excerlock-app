export type JsonPrimitive = boolean | number | string | null;
export type JsonValue =
  | JsonPrimitive
  | { readonly [key: string]: JsonValue }
  | readonly JsonValue[];

export interface TimelineRow<EventName extends string, Payload = JsonValue> {
  readonly atMs: number;
  readonly event: EventName;
  readonly payload: Payload;
}

export interface FixtureManifest<
  EventName extends string,
  Payload = JsonValue,
> {
  readonly name: string;
  readonly version: number;
  readonly description: string;
  readonly timeline: readonly TimelineRow<EventName, Payload>[];
}

export interface ManualPlayback {
  readonly mode: "manual";
}

export interface AutoPlayback {
  readonly mode: "auto";
  readonly speed: number;
}

export type TimelinePlayback = AutoPlayback | ManualPlayback;

export interface TimelinePlayerOptions<
  EventName extends string,
  Payload,
> {
  readonly manifest: FixtureManifest<EventName, Payload>;
  readonly allowedEvents: readonly EventName[];
  readonly playback: TimelinePlayback;
  readonly validateRow?: (row: TimelineRow<EventName, Payload>) => void;
  readonly onEvent: (row: TimelineRow<EventName, Payload>) => void;
}
