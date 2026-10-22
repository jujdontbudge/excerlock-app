export const PURCHASE_ATTEMPTS_KEY = 'excerlock-next.purchase-attempts.v1';

type Storage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

export type PurchaseAttempt = {
  operationId: string;
  checkoutUserId: string;
  vendorProductId: string;
  startedAt: string;
};

const parse = (raw: string | null): PurchaseAttempt[] => {
  try {
    const value = JSON.parse(raw ?? 'null');
    if (value?.version !== 1 || !Array.isArray(value.attempts)) return [];
    return value.attempts.filter((attempt: Partial<PurchaseAttempt> | null): attempt is PurchaseAttempt =>
      attempt !== null && typeof attempt.operationId === 'string' && typeof attempt.checkoutUserId === 'string' &&
      typeof attempt.vendorProductId === 'string' && typeof attempt.startedAt === 'string',
    ).slice(-16);
  } catch {
    return [];
  }
};

export class PurchaseAttempts {
  private value: PurchaseAttempt[] = [];
  private hydrated: Promise<void>;
  private writing = Promise.resolve();

  constructor(private storage: Storage) {
    this.hydrated = storage.getItem(PURCHASE_ATTEMPTS_KEY).then((raw) => { this.value = parse(raw); }, () => undefined);
  }

  async current(): Promise<readonly PurchaseAttempt[]> {
    await this.hydrated;
    return this.value;
  }

  async remember(attempt: PurchaseAttempt): Promise<void> {
    await this.hydrated;
    this.value = [...this.value.filter((item) => item.checkoutUserId !== attempt.checkoutUserId ||
      item.vendorProductId !== attempt.vendorProductId), attempt].slice(-16);
    await this.persist();
  }

  async forget(operationId: string): Promise<void> {
    await this.hydrated;
    this.value = this.value.filter((item) => item.operationId !== operationId);
    await this.persist();
  }

  private persist(): Promise<void> {
    const payload = JSON.stringify({ version: 1, attempts: this.value });
    this.writing = this.writing.catch(() => undefined).then(() => this.storage.setItem(PURCHASE_ATTEMPTS_KEY, payload));
    return this.writing;
  }
}
