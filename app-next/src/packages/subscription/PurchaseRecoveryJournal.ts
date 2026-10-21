import type { PurchaseRecovery, StorePurchase } from '../ports/SubscriptionPort';
import type { Unsubscribe } from '../model/models';

export const PURCHASE_RECOVERY_KEY = 'excerlock-next.purchase-recovery.v1';

type Storage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

const none = (): PurchaseRecovery => ({ type: 'none' });

const parse = (raw: string | null): PurchaseRecovery => {
  if (!raw) return none();
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (
      value.version !== 1 ||
      !['pending', 'accountConnection'].includes(String(value.type)) ||
      !['purchase', 'restore'].includes(String(value.operation)) ||
      typeof value.operationId !== 'string' ||
      typeof value.checkoutUserId !== 'string' ||
      typeof value.startedAt !== 'string'
    ) return none();
    const purchase = value.storePurchase as Partial<StorePurchase> | null | undefined;
    const storePurchase = purchase && typeof purchase.originalTransactionId === 'string' && purchase.originalTransactionId && typeof purchase.isSandbox === 'boolean'
      ? { originalTransactionId: purchase.originalTransactionId, isSandbox: purchase.isSandbox } : undefined;
    if (value.type === 'pending') return {
      type: 'pending',
      operation: value.operation as 'purchase' | 'restore',
      operationId: value.operationId,
      checkoutUserId: value.checkoutUserId,
      startedAt: value.startedAt,
      ...(storePurchase ? { storePurchase } : {}),
    };
    if (typeof value.confirmedAt !== 'string') return none();
    return {
      type: 'accountConnection',
      operation: value.operation as 'purchase' | 'restore',
      operationId: value.operationId,
      checkoutUserId: value.checkoutUserId,
      startedAt: value.startedAt,
      confirmedAt: value.confirmedAt,
      ...(storePurchase ? { storePurchase } : {}),
    };
  } catch {
    return none();
  }
};

export class PurchaseRecoveryJournal {
  private value: PurchaseRecovery = none();
  private listeners = new Set<(recovery: PurchaseRecovery) => void>();
  private writing = Promise.resolve();
  private hydrated: Promise<void>;

  constructor(private storage: Storage) {
    this.hydrated = storage.getItem(PURCHASE_RECOVERY_KEY).then((raw) => {
      this.value = parse(raw);
      this.publish();
    });
  }

  ready(): Promise<void> {
    return this.hydrated;
  }

  snapshot(): PurchaseRecovery {
    return this.value;
  }

  subscribe(callback: (recovery: PurchaseRecovery) => void): Unsubscribe {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  async begin(operation: 'purchase' | 'restore', checkoutUserId: string, startedAt: string): Promise<PurchaseRecovery> {
    await this.hydrated;
    const current = this.value;
    if (current.type !== 'none') return current;
    return this.write({
      type: 'pending',
      operation,
      operationId: `${operation}:${checkoutUserId}:${startedAt}`,
      checkoutUserId,
      startedAt,
    });
  }

  async confirm(checkoutUserId: string, confirmedAt: string, storePurchase?: StorePurchase): Promise<PurchaseRecovery> {
    await this.hydrated;
    const current = this.value;
    if (current.type === 'none' || current.checkoutUserId !== checkoutUserId) return current;
    if (current.type === 'accountConnection' && (current.storePurchase || !storePurchase)) return current;
    return this.write({ ...current, type: 'accountConnection', confirmedAt, ...(storePurchase ? { storePurchase } : {}) });
  }

  async clear(): Promise<void> {
    await this.hydrated;
    this.value = none();
    this.publish();
    this.writing = this.writing.then(() => this.storage.removeItem(PURCHASE_RECOVERY_KEY));
    await this.writing;
  }

  async connect(checkoutUserId: string, confirmedAt: string): Promise<void> {
    await this.hydrated;
    const current = this.value;
    if (current.type === 'none') return;
    await this.write({ ...current, type: 'accountConnection', checkoutUserId, confirmedAt });
  }

  private async write(next: Exclude<PurchaseRecovery, { type: 'none' }>): Promise<PurchaseRecovery> {
    this.value = next;
    this.publish();
    const payload = JSON.stringify({ version: 1, ...next });
    this.writing = this.writing.then(() => this.storage.setItem(PURCHASE_RECOVERY_KEY, payload));
    await this.writing;
    return next;
  }

  private publish() {
    this.listeners.forEach((listener) => listener(this.value));
  }
}
