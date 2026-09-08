# Conditions

`ConditionsScreen` reads the shared rule/app set; newest rules appear first. `mutations` owns validated saves, pause changes and deletion cleanup. Paused rules remain editable.

`ConditionBuilder` reuses the onboarding activity, branch, schedule and summary components. Every step renders inside the shell that owns Back, Cancel and the footer. `useBuilder` owns its scoped draft transaction, path, back navigation and edit snapshot; `builderFlow` handles branching, field validity and `editPath`, the branch an edit re-walks so a changed mode always reaches its goal screen. Changing the activity keeps the rule's id, createdAt and enabled. Only Save writes a rule, and saving reconciles gym conditions with the saved-gym list. Cancel confirms when dirty. `ConfirmSheet` is shared with settings and deletion flows.

`conditionStatus` gives each row one scannable line (paused, met today, blocking now, not scheduled today). It is a local stand-in for P2-T19's `domain/conditionState.ts`.

Tests cover all activities, both gym modes, per-step Back and Cancel, edit identity/schedule preservation, invalid-edit rollback, the gym pause lifecycle and empty state. Native evidence is in `evidence/T10`.
