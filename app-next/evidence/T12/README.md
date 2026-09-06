# T12 — Settings

All required rows and sub-screens are implemented: membership/restore, six permissions, distance units, stop-grace picker, gym auto-detect, haptics, locked apps, gyms, support, rate/share stand-ins, local legal documents, account and seven-tap developer entry. Sign-in reuses X4 in a native modal. Account deletion preserves conditions, progress, app selection and preferences.

## Verification

Six targeted tests pass, including a failing-first local-data preservation regression, units, out-of-range unit rejection, every required row, seven footer taps and support busy/success states. TypeScript and lint pass. Native recordings cover the complete settings scroll, every permission detail, both legal pages, gym picker, support entry/submission, sign-in and account deletion followed by the intact Conditions list. XL screenshots were reviewed and recaptured after stacking long row values below titles.

The native support run exposed a keyboard-covered Send button. It now lives in the keyboard-aware footer, and the repeated recording submits successfully. Unit changes relabel valid distance goals without conversion; a change that would create an invalid goal remains unapplied with an explanation.

## OtterLife mapping and motion

Independently reviewed segment 08; `otter-settings-study.png` is the extracted frame sheet. Otter’s actual order is General (About You, Data Source, Language, Notification, Units, Friends), Community (Instagram), Other (Apple Watch Sync, Changelog, Q&A, Feedback, Privacy Policy, User Agreement), version footer. ExcerLock maps profile and membership to About You, required permissions to Data Source/Notification, preferences to Units, sharing/rating to Community, and support/privacy/terms/account to Other. Removed vendor/widget/theme rows are not copied.

Groups stagger in, the profile glyph stays alive above the fold, preference selections slide, sheets follow the finger, and sub-screens push/fade with a consistent Back position. Support and account outcomes reveal their new content. Fake external actions stay local. Legal placeholders are marked in their content source. Gemini/human review remains deferred.
