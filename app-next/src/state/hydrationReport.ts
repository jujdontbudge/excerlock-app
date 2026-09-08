import { create } from 'zustand';

export class PersistError extends Error {
  readonly code = 'PERSIST_WRITE_FAILED' as const;

  constructor(
    readonly storeName: string,
    readonly cause: unknown,
  ) {
    super('PERSIST_WRITE_FAILED');
    this.name = 'PersistError';
  }
}

type HydrationReport = {
  droppedByStore: Record<string, number>;
  droppedCount: number;
  writeErrors: PersistError[];
  dismissed: boolean;
  recordDropped: (storeName: string, count: number) => void;
  recordWriteError: (error: PersistError) => void;
  dismiss: () => void;
  clear: () => void;
};

const total = (counts: Record<string, number>) => Object.values(counts).reduce((sum, count) => sum + count, 0);

export const hydrationReport = create<HydrationReport>((set) => ({
  droppedByStore: {},
  droppedCount: 0,
  writeErrors: [],
  dismissed: false,
  recordDropped: (storeName, count) =>
    set((state) => {
      const droppedByStore = { ...state.droppedByStore, [storeName]: count };
      return { droppedByStore, droppedCount: total(droppedByStore), dismissed: count > 0 ? false : state.dismissed };
    }),
  recordWriteError: (error) => set((state) => ({ writeErrors: [...state.writeErrors, error], dismissed: false })),
  dismiss: () => set({ dismissed: true }),
  clear: () => set({ droppedByStore: {}, droppedCount: 0, writeErrors: [], dismissed: false }),
}));
