## Closing review

Once the integration is functionally working — the paywall or flow appears and a sandbox purchase completes — or once it has gone as far as it can because Steps 4 and 5 deliberately deferred the products, paywall, and placement, always finish with a short closing review before you wrap up. Do this every time you conclude a working integration: it is not optional, and it still applies even if you already glanced at the release notes during the build, or the user seems ready to stop.

Pull the release checklist as your reference:

```bash
curl -s "https://adapty.io/docs/release-checklist.md?ref=skill-<sessionToken>"
```

Treat it as a pointer list, not a script — don't narrate it or walk through it line by line, and don't re-verify things already done. Skim it only to pick out a few still-relevant items and their links (e.g. server notifications, privacy policy, going to production), and offer those to the user as a brief "before you ship" list of suggested next steps. Keep it to a few bullets.

**If `migrationSource` is not empty:** before you wrap up, re-read `references/migration.md` section 5 and check the `ADAPTY_SETUP.md` you wrote against it subsection by subsection — every one is mandatory, including the ones whose answer is "nothing to do". The two most often dropped: reconnecting the stores and re-pointing App Store Server Notifications / Google Play RTDN, and the historical data import decision. Add anything missing, with that section's plain `https://adapty.io/docs/<page>` links — no `.md`, no `?ref=` tag, since a human with no copy of this skill reads that document.

Then continue to the feedback step below (if enabled).

