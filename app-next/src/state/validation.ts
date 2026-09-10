export const object = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
export const text = (v: unknown): v is string => typeof v === 'string' && v.length <= 500;
export const bool = (v: unknown): v is boolean => typeof v === 'boolean';
export const number =
  (min = 0, max = Number.MAX_SAFE_INTEGER) =>
  (v: unknown): v is number =>
    typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
export const oneOf = (values: readonly unknown[]) => (v: unknown) => values.includes(v);
export const iso = (v: unknown) => typeof v === 'string' && Number.isFinite(Date.parse(v));
export const nullable = (check: (v: unknown) => boolean) => (v: unknown) => v === null || check(v);
export const array = (check: (v: unknown) => boolean) => (v: unknown) => Array.isArray(v) && v.every(check);
export const shape = (fields: Record<string, (v: unknown) => boolean>) => (v: unknown) =>
  object(v) && Object.entries(fields).every(([key, check]) => check(v[key]));
export const permission = oneOf(['notDetermined', 'granted', 'denied', 'restricted']);
export const session = shape({ kind: oneOf(['anonymous']) });
export const signedIn = shape({
  kind: oneOf(['signedIn']),
  provider: oneOf(['apple', 'google', 'email']),
  email: nullable(text),
});
export const units = oneOf(['km', 'mi']);
export const lockedApps = shape({
  handle: nullable(shape({ token: text })),
  isEmpty: bool,
});
export const ruleDay = shape({
  ruleId: text,
  day: (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v),
  progress: number(),
  met: bool,
  metAt: nullable(iso),
});
export const walkingSession = nullable(
  shape({ ruleId: text, startedAt: iso, leaseUntil: iso, phase: oneOf(['verifying', 'walking', 'grace', 'ended']) }),
);
export const gymPresence = nullable(shape({ placeId: text, startedAt: iso, confirmedAt: nullable(iso) }));
