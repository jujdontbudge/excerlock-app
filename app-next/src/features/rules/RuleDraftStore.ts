import { create } from 'zustand';
import { createDraft, DraftAction, reduceDraft, RuleDraft } from './draft';
export const useRuleDraftStore = create<{
  draft: RuleDraft;
  replace: (draft: RuleDraft) => void;
  dispatch: (action: DraftAction) => void;
}>((set) => ({
  draft: createDraft('walking'),
  replace: (draft) => set({ draft }),
  dispatch: (action) => set((s) => ({ draft: reduceDraft(s.draft, action) })),
}));
