/** Local-only transport. Resolving means the share sheet closed, not delivery. */
export interface JsonExportDependencies {
  cacheDirectory: string | null;
  randomId(): string;
  isAvailable(): Promise<boolean>;
  write(uri: string, contents: string): Promise<void>;
  share(uri: string): Promise<void>;
  remove(uri: string): Promise<void>;
  /** Account/consent generation captured by the caller before building payload. */
  isCurrent(): boolean;
}

export function createJsonExport(deps: JsonExportDependencies) {
  let busy = false;
  return {
    async requestShare(payload: unknown): Promise<void> {
      if (busy) throw new Error('An export is already open.');
      busy = true;
      let uri: string | undefined;
      try {
        if (!deps.isCurrent()) throw new Error('Export session changed.');
        if (!deps.cacheDirectory || !(await deps.isAvailable())) {
          throw new Error('File sharing is unavailable on this device.');
        }
        if (!deps.isCurrent()) throw new Error('Export session changed.');
        const id = deps.randomId();
        if (!/^[a-zA-Z0-9-]{16,80}$/.test(id)) throw new Error('Invalid export file identifier.');
        const contents = JSON.stringify(payload, null, 2);
        if (contents === undefined) throw new Error('Invalid export data.');
        uri = `${deps.cacheDirectory.replace(/\/$/, '')}/excerlock-export-${id}.json`;
        await deps.write(uri, contents);
        if (!deps.isCurrent()) throw new Error('Export session changed.');
        await deps.share(uri);
      } finally {
        // Also remove partial writes. A cleanup failure is surfaced, never hidden.
        try {
          if (uri) await deps.remove(uri);
        } finally {
          busy = false;
        }
      }
    },
  };
}
