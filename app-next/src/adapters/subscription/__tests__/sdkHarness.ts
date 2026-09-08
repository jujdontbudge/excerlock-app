import type { AdaptyFlow, AdaptyPaywallProduct, AdaptyProfile, FlowEventHandlers } from 'react-native-adapty';
import { AdaptyFlowView, AdaptySdk } from '../adaptySdk';
import { annualProduct, monthlyProduct, profile } from './profiles';

export const compliantFlow = (): AdaptyFlow =>
  ({
    id: 'flow-1',
    name: 'ExcerLock Premium',
    variationId: 'variation-1',
    placement: { id: 'onboarding', abTestName: 'a', audienceName: 'all', revision: 1, isTrackingPurchases: true },
    paywalls: [],
    responseCreatedAt: 0,
    payloadData: JSON.stringify({
      blocks: [
        { text: '$59.99 / year after your 7-day free trial' },
        { text: 'Subscriptions renew automatically unless canceled.' },
        { link: { label: 'Terms of Use', url: 'https://excerlock.com/terms' } },
        { link: { label: 'Privacy Policy', url: 'https://excerlock.com/privacy' } },
      ],
    }),
  }) as unknown as AdaptyFlow;

export type FlowViewHarness = AdaptyFlowView & {
  presents: number;
  dismisses: number;
  fire<Name extends keyof FlowEventHandlers>(name: Name, ...args: Parameters<FlowEventHandlers[Name]>): unknown;
};

function flowViewHarness(): FlowViewHarness {
  let handlers: Partial<FlowEventHandlers> = {};
  const view: FlowViewHarness = {
    presents: 0,
    dismisses: 0,
    present: async () => {
      view.presents += 1;
    },
    dismiss: async () => {
      view.dismisses += 1;
    },
    setEventHandlers: (next) => {
      handlers = { ...handlers, ...next };
      return () => {
        handlers = {};
      };
    },
    fire: (name, ...args) => {
      const handler = handlers[name] as ((...values: unknown[]) => unknown) | undefined;
      if (!handler) throw new Error(`No handler registered for ${String(name)}`);
      return handler(...args);
    },
  };
  return view;
}

export type SdkHarness = {
  sdk: AdaptySdk;
  /** The Builder view created by the last `presentPaywall`. */
  view(): FlowViewHarness;
  emitProfile(next: AdaptyProfile): void;
  listeners: number;
  activate: jest.Mock;
  getProfile: jest.Mock;
  identify: jest.Mock;
  logout: jest.Mock;
  getFlow: jest.Mock;
  createFlowView: jest.Mock;
  logShow: jest.Mock;
  restorePurchases: jest.Mock;
  setFallback: jest.Mock;
  order: string[];
};

export type SdkHarnessOptions = {
  activate?: () => Promise<void>;
  profile?: () => Promise<AdaptyProfile>;
  restore?: () => Promise<AdaptyProfile>;
  flow?: () => Promise<AdaptyFlow>;
  products?: () => Promise<AdaptyPaywallProduct[]>;
};

/** A stand-in for `react-native-adapty` with every call observable and every result steerable. */
export function sdkHarness(options: SdkHarnessOptions = {}): SdkHarness {
  const order: string[] = [];
  let listener: ((next: AdaptyProfile) => void) | undefined;
  let view: FlowViewHarness | undefined;
  const record = <T>(name: string, value: () => Promise<T>) => {
    order.push(name);
    return value();
  };
  const harness: SdkHarness = {
    order,
    listeners: 0,
    activate: jest.fn(() => record('activate', options.activate ?? (async () => undefined))),
    getProfile: jest.fn(() => record('getProfile', options.profile ?? (async () => profile()))),
    identify: jest.fn(async (userId: string) => {
      order.push(`identify:${userId}`);
    }),
    logout: jest.fn(async () => {
      order.push('logout');
    }),
    getFlow: jest.fn((placement: string) =>
      record(`getFlow:${placement}`, options.flow ?? (async () => compliantFlow())),
    ),
    createFlowView: jest.fn(async () => {
      order.push('createFlowView');
      view = flowViewHarness();
      return view;
    }),
    logShow: jest.fn(async () => {
      order.push('logShow');
    }),
    restorePurchases: jest.fn(() => record('restorePurchases', options.restore ?? (async () => profile()))),
    setFallback: jest.fn(async () => {
      order.push('setFallback');
    }),
    sdk: {} as AdaptySdk,
    view: () => {
      if (!view) throw new Error('No Builder view was created');
      return view;
    },
    emitProfile: (next) => {
      if (!listener) throw new Error('No profile listener is attached');
      listener(next);
    },
  };
  harness.sdk = {
    activate: harness.activate as AdaptySdk['activate'],
    onProfileLoad: (callback) => {
      listener = callback;
      harness.listeners += 1;
      return {
        remove: () => {
          listener = undefined;
          harness.listeners -= 1;
        },
      };
    },
    getProfile: harness.getProfile as AdaptySdk['getProfile'],
    identify: harness.identify as AdaptySdk['identify'],
    logout: harness.logout as AdaptySdk['logout'],
    getFlow: harness.getFlow as AdaptySdk['getFlow'],
    getProducts: (options.products
      ? jest.fn(() => record('getProducts', options.products!))
      : jest.fn(async () => [annualProduct(), monthlyProduct()])) as AdaptySdk['getProducts'],
    createFlowView: harness.createFlowView as AdaptySdk['createFlowView'],
    logShow: harness.logShow as AdaptySdk['logShow'],
    restorePurchases: harness.restorePurchases as AdaptySdk['restorePurchases'],
    setFallback: harness.setFallback as AdaptySdk['setFallback'],
  };
  return harness;
}

/** A promise that never settles, for testing the launch budget. */
export const never = <T>(): Promise<T> => new Promise<T>(() => undefined);

/** Lets queued promise callbacks run without advancing the clock. */
export const flush = async (times = 4) => {
  for (let index = 0; index < times; index += 1) await Promise.resolve();
};
