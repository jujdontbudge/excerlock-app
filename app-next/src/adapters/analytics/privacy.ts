import {
  ClientEventName,
  enumValuesOf,
  eventsOwnedBy,
  isTrackedScreen,
  PropValue,
  transmittedPropertiesOf,
} from '@excerlock/analytics-events';
import { SafeProperties } from './PostHogClientPort';

const CLIENT_EVENTS = new Set<string>(eventsOwnedBy('client'));

/** D4/D5: the client may emit only the events the registry gives it. */
export function isClientEvent(event: string): event is ClientEventName {
  return CLIENT_EVENTS.has(event);
}

/**
 * The transport boundary, in two layers.
 *
 * The name layer keeps only the properties the registry declares transmittable, so a call site
 * that passes a gym name, a coordinate or a locked-app selection sends nothing. The value layer
 * drops a declared-enum property carrying an undeclared value — `AnalyticsPort.track()` takes an
 * untyped bag, and one ceremony call site fills `reason` from a caught exception's message.
 *
 * TypeScript rejects excess properties at typed call sites; this exists because not every call
 * site is typed and because a future adapter must not be able to widen the payload by accident.
 */
export function safeProperties(
  event: ClientEventName,
  properties: Readonly<Record<string, unknown>>,
): SafeProperties {
  const entries = transmittedPropertiesOf(event).flatMap<[string, PropValue]>((key) => {
    const value = properties[key];
    if (!isPropValue(value)) return [];
    const allowed = enumValuesOf(event, key);
    if (allowed && !allowed.includes(String(value))) return [];
    return [[key, value]];
  });
  return Object.fromEntries(entries);
}

/** D11: a `$screen` may only be one of the registry's screen ids, never a route or a title. */
export function safeScreen(name: string): string | null {
  return isTrackedScreen(name) ? name : null;
}

function isPropValue(value: unknown): value is PropValue {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}
