export const PURCHASE_INTENT_KEY = 'excerlock-next.ad-purchase-intent.v1';

type Storage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

export type PurchaseIntent = {
  operationId: string;
  account: string;
  vendorProductId: string;
  amount: number | null;
  currency: string | null;
  hadAccessBefore: boolean;
  launch: string;
};

const parse = (raw: string | null): PurchaseIntent | null => {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (value.version !== 1 || typeof value.operationId !== 'string' || typeof value.account !== 'string'
      || typeof value.vendorProductId !== 'string' || typeof value.hadAccessBefore !== 'boolean' || typeof value.launch !== 'string') return null;
    return {
      operationId: value.operationId,
      account: value.account,
      vendorProductId: value.vendorProductId,
      amount: typeof value.amount === 'number' ? value.amount : null,
      currency: typeof value.currency === 'string' ? value.currency : null,
      hadAccessBefore: value.hadAccessBefore,
      launch: value.launch,
    };
  } catch {
    return null;
  }
};

export class PurchaseIntentStore {
  readonly launch = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  private value: Promise<PurchaseIntent | null>;

  constructor(private storage: Storage) {
    this.value = storage.getItem(PURCHASE_INTENT_KEY).then(parse, () => null);
  }

  current(): Promise<PurchaseIntent | null> {
    return this.value;
  }

  async save(intent: Omit<PurchaseIntent, 'launch'>): Promise<void> {
    const next = { ...intent, launch: this.launch };
    this.value = Promise.resolve(next);
    await this.storage.setItem(PURCHASE_INTENT_KEY, JSON.stringify({ version: 1, ...next }));
  }

  async take(): Promise<PurchaseIntent | null> {
    const intent = await this.value;
    this.value = Promise.resolve(null);
    await this.storage.removeItem(PURCHASE_INTENT_KEY);
    return intent;
  }
}
