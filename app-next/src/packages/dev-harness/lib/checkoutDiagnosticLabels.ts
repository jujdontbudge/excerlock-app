import { transmittedPropertiesOf } from '@excerlock/analytics-events';

type Event = { event: string; props: Record<string, unknown> };
const diagnosticNames = ['checkout_attempt_started', 'checkout_stage_recorded', 'checkout_attempt_completed'] as const;
const isDiagnosticEvent = (event: string): event is typeof diagnosticNames[number] => diagnosticNames.some((name) => name === event);

export function checkoutDiagnosticLabels(events: readonly Event[]): string[] {
  const diagnostics = events.filter(({ event }) => isDiagnosticEvent(event));
  const ids = [...new Set(diagnostics.map(({ props }) => props.attempt_id))];
  return ids.flatMap((id, index) => {
    const attempt = diagnostics.filter(({ props }) => props.attempt_id === id);
    const started = attempt.filter(({ event }) => event === 'checkout_attempt_started');
    const terminals = attempt.filter(({ event }) => event === 'checkout_attempt_completed');
    const terminal = terminals[0]?.props;
    const context = started[0]?.props;
    const joined = typeof id === 'string' && /^[a-f0-9]{12}$/.test(id) && started.length === 1 && attempt.every(({ props }) =>
      props.operation === context.operation && props.plan_id === context.plan_id && props.placement === context.placement);
    const safe = attempt.every(({ event, props }) => isDiagnosticEvent(event) && Object.entries(props).every(([key, value]) =>
      value === undefined || (transmittedPropertiesOf(event).includes(key) && !/email|receipt|token|message|error|user_?id/i.test(key) &&
        (typeof value === 'boolean' || typeof value === 'number' && Number.isFinite(value) || typeof value === 'string' && /^[a-z0-9._-]{1,64}$/i.test(value)))));
    const stages = attempt.filter(({ event, props }) => event === 'checkout_stage_recorded' && props.stage_result === 'started').map(({ props }) => props.stage);
    const integration = attempt.find(({ props }) => props.stage === 'integration_attach' && ['failed', 'timed_out', 'skipped'].includes(String(props.stage_result)))?.props;
    const duration = terminal?.duration_ms;
    const timing = typeof duration === 'number' && duration >= 0 && (terminal?.sheet_observation === 'not_called' || typeof terminal?.storekit_ms === 'number' && terminal.storekit_ms >= 0 && terminal.storekit_ms <= duration);
    const serial = index + 1;
    return [
      `Checkout ${serial} ${context?.operation ?? 'unknown'} ${terminal?.outcome ?? 'in_flight'} · terminals ${terminals.length} · joined ${joined ? 'yes' : 'no'} · safe ${safe ? 'yes' : 'no'} · timing ${timing ? 'yes' : 'no'}`,
      `Checkout result ${serial} · stage ${terminal?.stage ?? 'none'} · failure ${terminal?.failing_stage ?? 'none'} · kind ${terminal?.failure_kind ?? 'none'} · code ${terminal?.failure_code ?? 'none'} · sheet ${terminal?.sheet_observation ?? 'none'} · entitlement ${terminal?.entitlement_result ?? 'none'}`,
      `Checkout context ${serial} · placement ${context?.placement ?? 'none'} · plan ${context?.plan_id ?? 'none'}`,
      `Checkout stages ${serial} · ${stages.join(' > ')}`,
      ...(integration ? [`Checkout integration ${serial} · ${integration.stage_result} · code ${integration.failure_code ?? 'none'} · kind ${integration.failure_kind}`] : []),
    ];
  });
}
