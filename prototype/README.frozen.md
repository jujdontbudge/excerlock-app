# Prototype status: frozen

`prototype/` is a harvest-only reference. Do not extend it into the production app.

Production work starts fresh in `app/` using the module boundaries in `ARCHITECTURE.md`. A component or
style may be deliberately copied into `app/src/ui/` when useful, then adapted and tested there; the
prototype itself remains unchanged.
