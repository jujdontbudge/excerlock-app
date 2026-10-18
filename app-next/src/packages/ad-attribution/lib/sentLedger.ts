export type LedgerStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

export const LEDGER_PREFIX = 'excerlock-ad-sent.v1';
const PREFIX = LEDGER_PREFIX;
const SENT = 'sent';
const safe = (part: string) => part.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 128);

export const ledgerKey = (...parts: string[]) => [PREFIX, ...parts.map(safe)].join('.');

export class SentLedger {
  private chain: Promise<unknown> = Promise.resolve();

  constructor(private storage: LedgerStorage) {}

  claim(keys: readonly string[]): Promise<boolean> {
    const next = this.chain.then(async () => {
      const existing = await Promise.all(keys.map((key) => this.storage.getItem(key)));
      if (existing.some((value) => value !== null)) return false;
      for (const key of keys) await this.storage.setItem(key, SENT);
      return true;
    });
    this.chain = next.catch(() => undefined);
    return next;
  }
}
