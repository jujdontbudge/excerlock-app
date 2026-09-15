/**
 * Small, dependency-free sign-in gate used by the sign-in screen.
 *
 * This lives outside `createAuthServices` on purpose: importing the factory
 * also imports the production Supabase/Adapty graph, and a research build must
 * not bundle production identity code just because the unused sign-in route
 * exists in the app route tree. Keep this module free of runtime SDK imports.
 */
export type SignInRequiredSource = boolean | (() => boolean) | (() => Promise<boolean>);

/** Root hook requirements (no second PostHog client here). See README. */
export function resolveSignInRequired(source: SignInRequiredSource | undefined, fallback = false): boolean | Promise<boolean> {
  if (source === undefined) return fallback;
  if (typeof source === 'boolean') return source;
  return source();
}
