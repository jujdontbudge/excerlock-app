# Onboarding

`OnboardingScreen` renders the twelve approved first-run steps from typed content
and emits choice/continue actions. Permission and app-picker boundaries are
explicit local previews; no OS API is called. The separate condition builder is
intentionally absent from this module.

App selection is transactional. The picker stages changes locally, commits the
complete selected-id set only when the user continues, and restores the entry
selection when a changed draft is discarded. Returning from Review starts a
fresh draft from the committed selection.
