# T07 — Trial and guarded paywall

T1–T4 and the local paywall slot are implemented. Offer metadata comes from the fake subscription port; the 7-day trial is a fixture. Annual/monthly/lifetime rows show dashed prices, with placeholder explanations only in dev controls. Purchase has an 800 ms busy state. Restore supports restored/not-found; cancel and error keep access blocked.

The root Expo Router protected routes remove onboarding history at P, protect setup and Home by entitlement, and disable the paywall's interactive back gesture. An entitled user resumes X1–X5 until setup is complete, then enters Home. T08 replaces the setup destination preview.

Validation: 221 tests / 81 suites passed. TypeScript passed. The first lint pass caught direct fake implementation imports in three new tests; these now use the runtime factory, and final lint and the focused 11 subscription tests pass. The token snapshot change is only the 800 ms purchase duration. Red logs precede the metadata, permission-flow and guard implementations.

Native recordings: `trial-and-purchase.mp4` covers T1→T4, fake notification prompt Allow, all three plan selections, purchase and X1. `paywall-reentry.mp4` covers expired trial, restore not-found, billing issue, purchase error and restored Home destination. Screenshots and AX trees accompany the screens. No OS permissions, network calls or purchases occur.

Gemini remains deferred. Raw media/logs are local; this evidence index is committed.
