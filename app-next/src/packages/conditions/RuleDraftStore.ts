import { create, createStore, StateCreator } from 'zustand';
import { createDraft, DraftAction, reduceDraft, RuleDraft } from './draft';
type DraftState = { draft: RuleDraft; replace: (draft: RuleDraft) => void; dispatch: (action: DraftAction) => void };
const state =
  (draft: RuleDraft): StateCreator<DraftState> =>
  (set) => ({
    draft,
    replace: (draft) => set({ draft }),
    dispatch: (action) => set((s) => ({ draft: reduceDraft(s.draft, action) })),
  });
export const useRuleDraftStore = create(state(createDraft('walking')));
export const createRuleDraftStore = (draft: RuleDraft) => createStore(state(draft));
