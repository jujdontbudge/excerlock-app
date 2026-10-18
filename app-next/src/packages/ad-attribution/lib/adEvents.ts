export const AD_EVENT_PROPERTIES = {
  registration: [],
  view_content: [],
  start_trial: [],
  subscribe: ['value', 'currency'],
} as const satisfies Record<string, readonly string[]>;

export type AdEventName = keyof typeof AD_EVENT_PROPERTIES;

export type AdEvent =
  | { name: 'registration' }
  | { name: 'view_content' }
  | { name: 'start_trial' }
  | { name: 'subscribe'; value: number; currency: string };

export class AdEventRejected extends Error {}

export function allowListed(event: AdEvent): AdEvent {
  const input = event as Record<string, unknown>;
  const name = input.name;
  if (typeof name !== 'string' || !(name in AD_EVENT_PROPERTIES)) throw new AdEventRejected('Unknown ad event');
  const allowed: readonly string[] = ['name', ...AD_EVENT_PROPERTIES[name as AdEventName]];
  const extra = Object.keys(input).filter((key) => !allowed.includes(key));
  if (extra.length) throw new AdEventRejected(`Ad event ${name} carries properties outside the allow-list: ${extra.join(', ')}`);
  if (name !== 'subscribe') return { name } as AdEvent;
  const { value, currency } = input;
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) throw new AdEventRejected('Subscribe needs a positive price');
  if (typeof currency !== 'string' || !/^[A-Z]{3}$/.test(currency)) throw new AdEventRejected('Subscribe needs an ISO 4217 currency');
  return { name, value: Math.round(value * 100) / 100, currency };
}
