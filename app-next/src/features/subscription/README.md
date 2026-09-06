# Trial and paywall

The trial screens read the fake offer through `SubscriptionPort.entitlement`. `PaywallSlot` supplies a local stand-in until Phase 2 mounts Adapty Paywall Builder. It serializes actions, presents an 800 ms busy state and reports cancel/error/not-found without granting access. Only the fake port changes entitlement.

Root route guards remove onboarding history at the paywall and protect setup/tabs by entitlement. Expired and billing-issue states select the in-app placement. Restore outcomes and placeholder offer notes are exposed only in the dev controls. Product prices remain dashes.
