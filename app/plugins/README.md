# Expo config plugins

Contract: hides native project mutation behind Expo Continuous Native Generation inputs. Invariants:
`withNoPush` remains first in `app.json`, and generated files are never edited as source.

Fixtures: the clean generated iOS project is the filesystem fixture. Test with
`npm run test:guardrails` from the repository root.
