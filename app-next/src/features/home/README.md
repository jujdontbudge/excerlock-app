# Home

Owns status presentation, per-condition progress, and the dashboard composition. Status and progress models are pure; a single app-level port subscription writes live progress into persisted RuleDays. The visual order follows Otter's dominant status, daily facts, then secondary actions. No screen owns fake counters or permission APIs.

Capture-only deep links `/home?steps=5000` and `/home?advance=3600000` update the existing Home instance so the live state transition remains visible. The regular dev menu also offers Add 1,000 steps, clock controls and Pause all conditions. These controls belong to the local Phase-1 runtime.

The state and progress snapshot tests live under `demo/__tests__` because feature modules must not import fake fixtures. Home itself depends only on ports, selectors and domain functions.
