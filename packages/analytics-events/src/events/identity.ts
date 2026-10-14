import type { EventSpecMap } from '../types'

export type SignInProvider = 'apple' | 'google' | 'email'

export type SignInSurface = 'sign_up' | 'sign_in'

export type SignInFailureClass = 'existing_account' | 'different_account' | 'provider' | 'code' | 'session' | 'unknown'

export const identityEvents = {
  sign_in_failed: { owner: 'client', transmittedProperties: ['provider', 'surface', 'reason_class', 'error_code'] },
} as const satisfies EventSpecMap

export interface IdentityEventProps {
  sign_in_failed: { provider: SignInProvider; surface: SignInSurface; reason_class: SignInFailureClass; error_code?: string }
}
