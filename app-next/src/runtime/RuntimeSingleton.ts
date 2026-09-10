export class RuntimeCleanupError extends Error {
  readonly retryUnsafe = true;

  constructor(readonly failures: readonly unknown[]) {
    super('Production runtime cleanup failed; restart the app before retrying');
    this.name = 'RuntimeCleanupError';
  }
}

const isRetryUnsafe = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && (error as { retryUnsafe?: unknown }).retryUnsafe === true;

/** One VM-owned graph shared by React and background task launches. */
export class RuntimeSingleton<T extends { disposeAsync(): Promise<void> }> {
  private pending: Promise<T> | null = null;
  private shutdown: Promise<void> | null = null;
  private blocked: unknown = null;
  constructor(private readonly create: () => Promise<T>) {}
  get = (): Promise<T> => {
    if (this.blocked) return Promise.reject(this.blocked);
    if (this.shutdown) return this.shutdown.then(() => this.get());
    if (!this.pending) {
      const pending = Promise.resolve().then(this.create);
      this.pending = pending;
      void pending.catch((error: unknown) => {
        if (isRetryUnsafe(error)) this.blocked = error;
        if (this.pending === pending) this.pending = null;
      });
    }
    return this.pending;
  };
  dispose = (): Promise<void> => {
    if (this.blocked) return Promise.reject(this.blocked);
    if (this.shutdown) return this.shutdown;
    const pending = this.pending;
    this.pending = null;
    if (!pending) return Promise.resolve();
    const shutdown = pending.then(
      async (runtime) => {
        try {
          await runtime.disposeAsync();
        } catch (error) {
          if (isRetryUnsafe(error)) this.blocked = error;
          throw error;
        }
      },
      (error: unknown) => {
        if (isRetryUnsafe(error)) { this.blocked = error; throw error; }
      },
    );
    this.shutdown = shutdown;
    void shutdown
      .finally(() => {
        if (this.shutdown === shutdown) this.shutdown = null;
      })
      .catch(() => undefined);
    return shutdown;
  };
}
