import type { EventSpecMap } from '../types'

export type SignInProvider = 'apple' | 'google' | 'email'

export type SignInSurface = 'sign_up' | 'sign_in'

export type SignInFailureClass = 'existing_account' | 'different_account' | 'no_account' | 'rate_limited' | 'provider' | 'code' | 'session' | 'unknown'

export type AuthOperation = 'save' | 'sign_in' | 'switch'

export type AuthResult = 'saved' | 'existing_account' | 'switched' | 'code_sent' | 'signed_in' | 'cancelled' | 'failed'

export const identityEvents = {
  auth_started: { owner: 'client', transmittedProperties: ['provider', 'operation'] },
  auth_completed: { owner: 'client', transmittedProperties: ['provider', 'operation', 'result', 'failure_code'] },
  sign_in_failed: { owner: 'client', transmittedProperties: ['provider', 'surface', 'reason_class', 'failure_code'] },
} as const satisfies EventSpecMap

export interface IdentityEventProps {
  auth_started: { provider: SignInProvider; operation: AuthOperation }
  auth_completed: { provider: SignInProvider; operation: AuthOperation; result: AuthResult; failure_code?: string }
  sign_in_failed: { provider: SignInProvider; surface: SignInSurface; reason_class: SignInFailureClass; failure_code?: string }
}
