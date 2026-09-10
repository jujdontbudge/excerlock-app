/** One VM-owned graph shared by React and background task launches. */
export class RuntimeSingleton<T extends { disposeAsync(): Promise<void> }> {
  private pending: Promise<T> | null = null;
  private shutdown: Promise<void> | null = null;
  constructor(private readonly create: () => Promise<T>) {}
  get = (): Promise<T> => {
    if (this.shutdown) return this.shutdown.then(() => this.get());
    if (!this.pending) {
      const pending = Promise.resolve().then(this.create);
      this.pending = pending;
      void pending.catch(() => {
        if (this.pending === pending) this.pending = null;
      });
    }
    return this.pending;
  };
  dispose = (): Promise<void> => {
    if (this.shutdown) return this.shutdown;
    const pending = this.pending;
    this.pending = null;
    if (!pending) return Promise.resolve();
    const shutdown = pending.then(
      (runtime) => runtime.disposeAsync(),
      () => undefined,
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
