# Settings feature

This module owns the Settings root plus reusable detail, permission, account, notification, review, support, and legal screens. Router files map section slugs to these typed compositions.

All switches and choices are local demo state. Rows that resemble Settings, App Store review, notification permission, export, account, support, browser, or share surfaces are explicitly marked as prototype previews and emit callbacks only. They never call an operating-system, account, billing, network, or file API.

Reducer-owned settings persist into parent summaries. Focused edits use labeled `AccessibleModal` sheets with explicit Cancel/Done behavior; this intentionally replaces native form sheets and inertial wheel pickers. The Appearance detail animates its local token-preview card, while the `DESIGN.md` ledger continues to mark whole-screen theming as partial.
