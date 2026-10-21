import { PaywallRoute } from '../src/packages/paywall/PaywallRoute';
import { BootGate } from '../src/packages/launch/BootGate';
import { useJourney } from '../src/packages/journey/index';
import { useRuntime } from '../src/packages/ports/useRuntime';
import { useIsFocused } from 'expo-router';

export default function PaywallEntry() {
  const focused = useIsFocused();
  const runtime = useRuntime();
  const journey = useJourney(runtime);
  const booting = journey.phase === 'launch' || journey.phase === 'verifying' || journey.phase === 'signIn';
  return !focused ? null : booting ? <BootGate paywallRequested /> : <PaywallRoute />;
}
