/**
 * The one onboarding step-id vocabulary.
 *
 * The persisted store accepts exactly these ids and the router renders exactly
 * these ids, so a remote flow payload (B8) is validated against the same shape
 * before it can name a step the app would reject or fail to render. The retired
 * trial screens T1–T4 stay readable so an older saved install still resumes.
 */
export const onboardingStepIdPattern =
  /^(O(0[1-9]|1[0-9]|2[0-2])|W[0-3]|G([12]|0[FH])|[RB][12]|D|S[1-3]|S3[b-d]|T[1-4]|P)$/;

export function isOnboardingStepId(value: unknown): value is string {
  return typeof value === 'string' && onboardingStepIdPattern.test(value);
}
