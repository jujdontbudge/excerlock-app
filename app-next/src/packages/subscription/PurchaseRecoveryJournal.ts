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
  private hydrated: Promise<void> | null = null;

  constructor(private storage: Storage) {
    void this.ready().catch(() => undefined);
  }

  ready(): Promise<void> {
    if (!this.hydrated) {
      this.hydrated = this.storage.getItem(PURCHASE_RECOVERY_KEY).then((raw) => {
        this.value = parse(raw);
        this.publish();
      }).catch((error) => {
        this.hydrated = null;
        throw error;
      });
    }
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
    return this.update((current) => current.type !== 'none' ? current : ({
      type: 'pending',
      operation,
      operationId: `${operation}:${checkoutUserId}:${startedAt}`,
      checkoutUserId,
      startedAt,
    }));
  }

  async confirm(checkoutUserId: string, confirmedAt: string, storePurchase?: StorePurchase): Promise<PurchaseRecovery> {
    return this.update((current) => {
      if (current.type === 'none' || current.checkoutUserId !== checkoutUserId) return current;
      if (current.type === 'accountConnection' && (current.storePurchase || !storePurchase)) return current;
      return { ...current, type: 'accountConnection', confirmedAt, ...(storePurchase ? { storePurchase } : {}) };
    });
  }

  async clear(): Promise<void> {
    await this.update(() => none());
  }

  async connect(checkoutUserId: string, confirmedAt: string): Promise<void> {
    await this.update((current) => current.type === 'none' ? current : ({ ...current, type: 'accountConnection', checkoutUserId, confirmedAt }));
  }

  private async update(change: (current: PurchaseRecovery) => PurchaseRecovery): Promise<PurchaseRecovery> {
    await this.ready();
    const operation = this.writing.then(async () => {
      const next = change(this.value);
      if (next === this.value) return next;
      if (next.type === 'none') {
        try { await this.storage.removeItem(PURCHASE_RECOVERY_KEY); }
        catch {
          await new Promise<void>((resolve) => setTimeout(resolve, 300));
          await this.storage.removeItem(PURCHASE_RECOVERY_KEY);
        }
      }
      else await this.storage.setItem(PURCHASE_RECOVERY_KEY, JSON.stringify({ version: 1, ...next }));
      this.value = next;
      this.publish();
      return next;
    });
    this.writing = operation.then(() => undefined, () => undefined);
    return operation;
  }

  private publish() {
    this.listeners.forEach((listener) => listener(this.value));
  }
}
