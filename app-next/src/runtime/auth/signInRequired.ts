export type SignInRequiredSource = boolean | (() => boolean) | (() => Promise<boolean>);

export function resolveSignInRequired(source: SignInRequiredSource | undefined, fallback = false): boolean | Promise<boolean> {
  if (source === undefined) return fallback;
  if (typeof source === 'boolean') return source;
  return source();
}
