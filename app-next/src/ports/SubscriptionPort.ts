import { Entitlement } from '../domain/types';
import { Unsubscribe } from './models';
export interface SubscriptionPort {
  entitlement(): Entitlement;
  presentPaywall(placement: string): Promise<Entitlement>;
  restore(): Promise<Entitlement>;
  identify(userId: string): void;
  reset(): void;
  subscribe(callback: (entitlement: Entitlement) => void): Unsubscribe;
}
