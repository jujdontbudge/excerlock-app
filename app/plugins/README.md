# Expo config plugins

Config plugins are the source of truth for native customization under Expo Continuous Native
Generation. `withNoPush` remains the first entry in `app.json`; additional plugins must preserve that
ordering and pass the filesystem guardrails.
