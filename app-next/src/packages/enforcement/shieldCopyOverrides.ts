
export const SHIELD_COPY_OVERRIDES_KEY = 'excerlock.shield.copy-overrides.v1';

export const SHIELD_COPY_CAUSES = ['balanceEmpty', 'bankEmpty', 'fullLock', 'lockWindow', 'walkAndScrollEnded'] as const;

export type ShieldCopyCause = (typeof SHIELD_COPY_CAUSES)[number];

export type ShieldCopyOverride = { title?: string; subtitle?: string };

export type ShieldCopyOverrides = Partial<Record<ShieldCopyCause, ShieldCopyOverride>>;

declare const shieldCopyOverridesJson: unique symbol;

export type ShieldCopyOverridesJson = string & { readonly [shieldCopyOverridesJson]: true };

const CAUSES: ReadonlySet<string> = new Set(SHIELD_COPY_CAUSES);
const MAX_TITLE_LENGTH = 80;
const MAX_SUBTITLE_LENGTH = 160;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

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
