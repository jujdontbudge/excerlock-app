# Settings

Root Settings is one hub. Every row opens a real destination except Support, which opens Mail. There is no nested More settings screen, profile photo, or stats.

`SettingsScreen` lists the profile row, one flat compact group, and a version footer. Seven taps on the version open the developer screen.

| Row | Subtitle | Destination |
|---|---|---|
| Profile (name or Account) | Account & privacy | `account` |
| Manage subscription | `settingsCopy.plan(status)` | `subscription` |
| Notifications | switch | grants or denies the notifications permission |
| Report a bug | Tell us what went wrong | `bug` |
| Give feedback | Help us make ExcerLock better | `feedback` |
| Support | Email us | `mailto:` `[ExcerLock] Support` |
| Legal | Terms and privacy | `legal` |

`UnitsScreen` chooses Kilometers or Miles through `setUnits`. An out-of-range saved distance goal shows `unitsError` and leaves the unit unchanged.

`PreferencesScreen` is headed Privacy & permissions. It lists the six permission rows, Walk & Scroll stop grace, gym auto-detect, haptics, saved gyms, and the Screen Time app picker.

`BugReportScreen` and `FeedbackScreen` are thin wrappers around `SupportFormScreen`. Bug reports send category `Problem` and attach device info. Feedback sends category `Idea`. Both offer Email support instead via `openSupportEmail()`. Jest uses the fake port (`via: 'server'`). On iOS outside tests, `supportDelivery` opens Mail to `johansardar77@gmail.com`. The VPS `/v1/support` path can email the same address through Resend after persist; a missing key does not fail the request. Feature voting is not exposed.

`LegalHubScreen` links Privacy Policy and Terms of Use. Those documents are Phase 1 placeholders (`src/content/legal.ts`).

`SettingsPage` provides back navigation for destinations. `PermissionDetail`, `GymsScreen`, `BugReportScreen`, `FeedbackScreen`, `SubscriptionScreen`, `AccountScreen` and `LegalScreen` own their screens. `preferences` relabels saved distance rules when units change; values are not converted. Account deletion returns to an anonymous session and preserves local data.
