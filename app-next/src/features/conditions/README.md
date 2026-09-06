# Conditions

`ConditionsScreen` reads the shared rule/app set; newest rules appear first. `mutations` owns validated saves, pause changes and deletion cleanup. Paused rules remain editable.

`ConditionBuilder` reuses the onboarding activity, branch, schedule and summary components. `useBuilder` owns its scoped draft transaction, path, back navigation and edit snapshot; `builderFlow` handles branching and field validity. Only Save writes a rule. Cancel confirms when dirty. `ConfirmSheet` is shared with settings and deletion flows.

Tests cover all activities, both gym modes, edit identity/schedule preservation, invalid-edit rollback and empty state. Native evidence is in `evidence/T10`.
