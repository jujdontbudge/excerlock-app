export const onboardingStepIdPattern =
  /^(O(0[1-9]|1[0-9]|2[0-4])|W[0-3]|G([12]|0[FH])|[RB][12]|D|S[1-3]|S3[b-d]|T[1-4]|P)$/;

export function isOnboardingStepId(value: unknown): value is string {
  return typeof value === 'string' && onboardingStepIdPattern.test(value);
}
