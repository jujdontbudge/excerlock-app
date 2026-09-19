/**
 * The one onboarding step-id vocabulary.
 *
 * The persisted store accepts exactly these ids and the router renders exactly
 * these ids, so a remote flow payload (B8) is validated against the same shape
 * before it can name a step the app would reject or fail to render.
 */
export const onboardingStepIdPattern =
  /^(O(0[1-9]|1[0-9]|20)|W[0-3]|G([12]|0[FH])|[RB][12]|D|S[1-4]|S3b|T[1-4]|P)$/;

export function isOnboardingStepId(value: unknown): value is string {
  return typeof value === 'string' && onboardingStepIdPattern.test(value);
}
