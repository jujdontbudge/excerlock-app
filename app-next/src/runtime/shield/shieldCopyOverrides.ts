/**
 * Remote shield copy: the App Group document the ShieldConfiguration extension
 * reads and the PostHog `shield_copy` payload that produces it.
 *
 * The string key and the cause keys below are mirrored in
 * `targets/ShieldConfiguration/ShieldContent.swift` and written by
 * `modules/excerlock-enforcement/ios/ShieldCopyOverrides.swift`.
 * `guardrails/shield-copy.test.ts` pins all three together.
 */

/** App Group key read by `ShieldContentCatalog.copyOverridesKey`. */
export const SHIELD_COPY_OVERRIDES_KEY = 'excerlock.shield.copy-overrides.v1';

/** Cause keys mirrored by the `ShieldCause` enum in ShieldContent.swift. */
export const SHIELD_COPY_CAUSES = ['balanceEmpty', 'fullLock', 'lockWindow', 'walkAndScrollEnded'] as const;

export type ShieldCopyCause = (typeof SHIELD_COPY_CAUSES)[number];

/** Only `title` and `subtitle` are overridable; buttons and links stay native. */
export type ShieldCopyOverride = { title?: string; subtitle?: string };

export type ShieldCopyOverrides = Partial<Record<ShieldCopyCause, ShieldCopyOverride>>;

declare const shieldCopyOverridesJson: unique symbol;

/**
 * JSON accepted by the native writer. Only `serializeShieldCopyOverrides` can
 * produce the brand, so an unvalidated string cannot reach the App Group.
 */
export type ShieldCopyOverridesJson = string & { readonly [shieldCopyOverridesJson]: true };

const CAUSES: ReadonlySet<string> = new Set(SHIELD_COPY_CAUSES);
// Sanity limits, not layout budgets: shield copy is a title plus one subtitle,
// and an oversized payload is an operator error rather than a longer sentence.
const MAX_TITLE_LENGTH = 80;
const MAX_SUBTITLE_LENGTH = 160;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Strictly validates the `shield_copy` flag payload.
 *
 * Returns `null` when any part is malformed — an unknown cause, an unknown
 * field, a non-string or empty value, or an oversized string — so the caller
 * writes nothing and leaves the last applied copy in place. An empty object is
 * valid and clears every override, which falls back to the bundled plist copy.
 */
export function parseShieldCopyOverrides(payload: unknown): ShieldCopyOverrides | null {
  if (!isRecord(payload)) return null;
  const overrides: ShieldCopyOverrides = {};
  for (const [cause, value] of Object.entries(payload)) {
    if (!CAUSES.has(cause) || !isRecord(value)) return null;
    const override: ShieldCopyOverride = {};
    for (const [field, text] of Object.entries(value)) {
      if (field !== 'title' && field !== 'subtitle') return null;
      if (typeof text !== 'string') return null;
      const trimmed = text.trim();
      if (trimmed.length === 0 || trimmed.length > (field === 'title' ? MAX_TITLE_LENGTH : MAX_SUBTITLE_LENGTH))
        return null;
      override[field] = trimmed;
    }
    overrides[cause as ShieldCopyCause] = override;
  }
  return overrides;
}

/** Canonical JSON (fixed cause order, trimmed copy) for the native writer. */
export function serializeShieldCopyOverrides(overrides: ShieldCopyOverrides): ShieldCopyOverridesJson {
  const ordered: Record<string, ShieldCopyOverride> = {};
  for (const cause of SHIELD_COPY_CAUSES) {
    const override = overrides[cause];
    if (!override) continue;
    ordered[cause] = {
      ...(override.title === undefined ? {} : { title: override.title }),
      ...(override.subtitle === undefined ? {} : { subtitle: override.subtitle }),
    };
  }
  return JSON.stringify(ordered) as ShieldCopyOverridesJson;
}
