import { Session } from '../domain/types';
import { bindIdentity, IdentityPorts } from '../domain/identity';
import { entitlementAccess } from '../domain/entitlementAccess';
import { SubscriptionPort } from '../ports/SubscriptionPort';

type SignInResumeRuntime = IdentityPorts & {
  subscription: IdentityPorts['subscription'] & Pick<SubscriptionPort, 'restore'>;
};

export type SignInResumeResult = 'entitled' | 'noSubscription' | 'error';

export async function resumeAfterSignIn(
  runtime: SignInResumeRuntime,
  session: Session,
): Promise<SignInResumeResult> {
  bindIdentity(runtime, session.userId);
  try {
    const entitlement = await runtime.subscription.restore();
    return entitlementAccess(entitlement.status).appAccess ? 'entitled' : 'noSubscription';
  } catch {
    return 'error';
  }
}
