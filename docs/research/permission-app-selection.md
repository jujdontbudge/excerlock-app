# Choosing Locked apps — 2026-09-30

The design uses one obvious action to open Apple's picker, an apps/categories count summary after dismissal, Change apps, and explicit Continue. Choices stay on the iPhone; ExcerLock never displays app identities from opaque tokens.

Observed public product guidance:

- [Opal: Block and Allow Lists](https://www.opal.so/help/how-do-i-use-block-lists-and-allow-lists): Apps Blocked opens a selection; users edit and save their list. Apple owns the available apps and categories. Copy the explicit selection, review, edit and commit pattern, without adding Opal's list-management complexity.
- [Opal: Search for an app](https://www.opal.so/help/search-for-an-app-or-website-in-your-block-list-or-allow-list): Choose Activities is Apple's UI, with search and expandable categories. Keep the system picker and explain the action on the page around it.
- [ScreenZen](https://screenzen.co/): positions selecting distracting apps and websites as the basis for personalized limits. Keep the explanation focused on the distracting apps the user's Conditions will lock.
- [one sec](https://one-sec.app/), [Jomo](https://jomo.so/), [Brick](https://getbrick.app/), [Clearspace](https://www.getclearspace.com/), and [Freedom](https://freedom.to/) were included in public-web discovery. Their recorded selection sequences have not been verified, so no screen-level claim is attributed to them.

ScreensDesign recorded screens were available on the continuation and visually inspected:

- [Opal selection](https://screensdesign.com/apps/opal-screen-time-control/?vs=132790): Apple-style searchable selection, separate app/website/category counts, explicit Save and Cancel. Copy the reviewable count and explicit commit.
- [one sec selection](https://screensdesign.com/apps/one-sec-screen-time-focus/?vs=213381): separates blocked categories, apps and websites with Add actions and Done. Copy the clear distinction between apps and categories, with fewer controls for first-time Setup.
- [ClearSpace picker](https://screensdesign.com/apps/clearspace-reduce-screen-time/?vs=16781): uses Choose Activities and an obvious save action. Retain Apple's selection interface.
- [Freedom summary](https://screensdesign.com/apps/freedom-screen-time-control/?vs=327341): shows “1 Category” and “Add or Remove iOS Apps” before creating the Blocklist. Copy the summary plus an obvious edit action before Continue.

The library had no ScreenZen or Jomo result. The Brick name matched an unrelated building-bricks app, which was excluded. Their public websites were reviewed but their recorded selection flows remain unverified. Google search redirected and DuckDuckGo challenged the request; public vendor help pages supplied the web evidence. These are observed interaction patterns, not measured conversion claims. ScreensDesign skill 1.0.10 is available; this research used compatible 1.0.8 instructions.

ExcerLock implementation: orange-to-ivory ScreenShell, Heading, LivingIcon, SettingsGroup/SettingsRow, SecondaryButton and PrimaryButton, token-only chrome. Not now sits beside Close on the left, clear of the development menu gear. That gear is dev-only; the production header had no second control in the top-right position.
