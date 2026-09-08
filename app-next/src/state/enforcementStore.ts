import { create } from 'zustand';
import { ApplyResult } from '../runtime/upstreamCompatibility';

type EnforcementState = {
  enforcementStatus: ApplyResult | null;
  lastClaimAt: string | null;
  retryToken: number;
  publish: (enforcementStatus: ApplyResult) => void;
  claimed: (lastClaimAt: string) => void;
  retry: () => void;
};

export const enforcementStore = create<EnforcementState>((set) => ({
  enforcementStatus: null,
  lastClaimAt: null,
  retryToken: 0,
  publish: (enforcementStatus) => set({ enforcementStatus }),
  claimed: (lastClaimAt) => set({ lastClaimAt }),
  retry: () => set((state) => ({ retryToken: state.retryToken + 1 })),
}));
