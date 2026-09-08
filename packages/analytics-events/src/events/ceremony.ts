import type { EmptyProps, EventSpecMap } from '../types'

/** The two full-screen unlock ceremonies entered from the Home lock (B20). */
export type CeremonyKind = 'gym' | 'treadmill'

/** Why the treadmill scan gave up. A closed set — never a caught exception's message (D12). */
export type TreadmillScanFailure =
  | 'denied'
  | 'restricted'
  | 'notDetermined'
  | 'timeout'
  | 'exception'

const CEREMONY_KINDS = ['gym', 'treadmill'] as const
const SCAN_FAILURES = ['denied', 'restricted', 'notDetermined', 'timeout', 'exception'] as const

/**
 * The aha-unlock ceremonies (B20, `docs/specs/aha-unlock-screens.md`) — client-owned: detection
 * runs entirely on-device.
 *
 * `preview` marks a ceremony walked in the onboarding preview rather than a real unlock, so the
 * funnel can separate the two. `gym_unlock_tapped` carries the distance to the saved gym for the
 * on-device decision only: it is a location-derived value and never crosses the boundary.
 */
export const ceremonyEvents = {
  unlock_screen_opened: {
    owner: 'client',
    transmittedProperties: ['kind', 'preview'],
    enumProperties: { kind: CEREMONY_KINDS },
  },
  unlock_ceremony_done: {
    owner: 'client',
    transmittedProperties: ['kind', 'preview'],
    enumProperties: { kind: CEREMONY_KINDS },
  },
  treadmill_scan_started: { owner: 'client', transmittedProperties: ['preview'] },
  treadmill_scan_verified: { owner: 'client', transmittedProperties: ['ms', 'preview'] },
  treadmill_scan_failed: {
    owner: 'client',
    transmittedProperties: ['reason', 'preview'],
    enumProperties: { reason: SCAN_FAILURES },
  },
  gym_unlock_tapped: { owner: 'client', transmittedProperties: ['preview'] },
  gym_unlock_confirmed: { owner: 'client', transmittedProperties: ['preview'] },
  gym_unlock_lost: { owner: 'client', transmittedProperties: [] },
} as const satisfies EventSpecMap

export interface CeremonyEventProps {
  unlock_screen_opened: { kind: CeremonyKind; preview: boolean }
  unlock_ceremony_done: { kind: CeremonyKind; preview: boolean }
  treadmill_scan_started: { preview: boolean }
  // `ms` is how long the scan took to verify — a duration, not a health or motion value.
  treadmill_scan_verified: { ms: number; preview: boolean }
  treadmill_scan_failed: { reason: TreadmillScanFailure; preview?: boolean }
  // `distance` is metres to the saved gym: declared for the call site, never transmitted.
  gym_unlock_tapped: { distance: number; preview: boolean }
  gym_unlock_confirmed: { preview?: boolean }
  gym_unlock_lost: EmptyProps
}
