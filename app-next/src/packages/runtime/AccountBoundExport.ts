import type { AuthIdentity } from '../ports/AuthPort';
import type { ExportPayload, ExportPort } from '../ports/ExportPort';

type PayloadExporter = Readonly<{ requestShare(payload: ExportPayload): Promise<void> }>;

export function createAccountBoundExport(
  identity: () => AuthIdentity,
  exporter: PayloadExporter,
  isDisposed: () => boolean,
): ExportPort {
  let busy = false;
  return {
    async requestShare(buildPayload) {
      if (busy) throw new Error('An export is already open');
      busy = true;
      const origin = identity();
      const isCurrent = () => {
        const live = identity();
        return !isDisposed() && live.kind !== 'deleting' && live.kind === origin.kind &&
          live.generation === origin.generation && live.userId === origin.userId;
      };
      try {
        if (!isCurrent()) throw new Error('Export session changed.');
        const payload = await buildPayload();
        if (!isCurrent()) throw new Error('Export session changed.');
        await exporter.requestShare(payload);
        if (!isCurrent()) throw new Error('Export session changed.');
      } finally {
        busy = false;
      }
    },
  };
}
