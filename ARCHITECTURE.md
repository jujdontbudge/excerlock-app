# ExcerLock architecture

ExcerLock has one shape everywhere: five nouns, each with one folder and one job. A folder tells you where code runs and which imports are legal. `./excer check` enforces the rules below through `app-next/.dependency-cruiser.cjs`; if the check passes, the shape is right.

## The five nouns

| Noun | Folder | Job | May import |
|---|---|---|---|
| Route | `app-next/app/**` | One screen a user can open. Parses params, wires navigation, renders package screens. | Package entry points only. |
| Package | `app-next/src/packages/<name>/` | One product concept: its store, rules, screens and copy. | Entry points of packages in lower layers. |
| Adapter | `<package>/Native*.ts` entry or `<package>/lib/native/**` | Satisfies a port with iOS or an SDK. | Its own package, `app-next/modules`, platform SDKs. |
| Extension | `app-next/targets/*`, `app-next/modules/*` | Native Swift. The Screen Time extensions run in separate iOS processes. | Shares data with JavaScript only through the App Group schema in `enforcement`. |
| Composition root | `app-next/src/packages/runtime/` | Chooses the real adapters or the `dev-harness` fakes, builds the `Runtime` and starts the app (`AppRoot`). | Everything's entry points. |

`ports` holds the contracts: every port interface, the `Runtime` type that bundles them, and `useRuntime()`. Packages talk to the device only through `useRuntime()`; `runtime` decides what stands behind it.

The server uses the same shape: `server/src/packages/<name>/` for packages, thin route files that validate, call one package and respond, and `server/src/app.ts` as the composition root.

## Package shape

```
src/packages/<name>/
  <Entry>.ts(x)   public entry points: every root file (screens, hooks, stores, functions)
  Native*.ts      an adapter entry; only runtime (or another adapter) imports it
  README.md       optional: knowledge that does not fit in names
  lib/            private implementation; nothing outside the package may import it
  lib/native/     private code that touches app-next/modules
```

- A root file is public; anything in a subfolder is private. Keep a file in `lib/` until another package needs it.
- Several small entry files beat one barrel. Never re-export a whole subtree.
- Packages are flat: a package never contains another package.
- Each store belongs to one package, and only that package writes it.
- Copy lives with its package as `<topic>Copy.ts`.
- Add a package with `./excer new package <name>`, then add it to a layer here and in `app-next/.dependency-cruiser.cjs`.
- Move files with `./excer move <source...> <destination>`; it rewrites every import that points at them.

## Packages, bottom to top

A package imports only packages from a lower layer, never from its own layer, so the package graph can never form a cycle.

| Layer | Packages |
|---|---|
| 1 | `model` (shared nouns: Rule, Schedule, Entitlement, Answers…), `persistence` (persisted stores), `platform` (environment, client configuration, runtime lifecycle), `trace` (research trace switch), `ui` (design system, motion, icons, tokens), `updates` (OTA coordinator) |
| 2 | `preferences` (profile and settings stores), `schedule` (calendar math, schedule windows and schedule views) |
| 3 | `ports` (port interfaces, `Runtime`, `useRuntime`) |
| 4 | `conditions` (condition model, stores and editing steps), `identity` (sign-in, session), `telemetry` (PostHog, Sentry) |
| 5 | `app-selection` (Screen Time picker and selection), `permissions` (permission state, setup needs, system alerts), `subscription` (entitlement, Adapty) |
| 6 | `gyms` (saved gyms, gym picker, place search), `notifications` |
| 7 | `activity` (walking and gym detection, sensors, location) |
| 8 | `progress` (daily progress, history, streaks) |
| 9 | `lock` (lock decision and the selectors screens read) |
| 10 | `enforcement` (shield and Screen Time enforcement), `insights` (Analytics tab), `unlock` (gym and treadmill unlock) |
| 11 | `home` (Home tab and tab shell), `support` (incident reports, feedback) |
| 12 | `onboarding` (profile questions, plan, condition demo), `settings` (Settings tab) |
| 13 | `editor` (Conditions tab and builder), `launch` (boot and root navigation), `paywall`, `setup` (post-paywall setup flow) |
| 14 | `dev-harness` (scenarios, fakes, dev menu, previews, diagnostics) |
| 15 | `runtime` (composition root) |
| 16 | `research` (Linked Recorder lab builds only) |

## Rules

1. Import other packages only through their root files.
2. No dependency cycles, between files or between packages.
3. Layers: a package imports only packages from lower layers.
4. Routes import only package entry points and never `Native*` adapters.
5. Native code: only `runtime`, `<package>/lib/native/**` and `Native*` entry files import `app-next/modules`. Another package reaches a `Native*` entry only from `runtime`, `research` or another adapter.
6. No comments in TypeScript or JavaScript (`excerlock/no-comments`). Allowed: `eslint-disable-next-line <rule> -- <reason>`, `@ts-expect-error <reason>`, `/// <reference …>`. Put knowledge in names, types, `CONTEXT.md`, a package README or an ADR. Swift is exempt.
7. No tests. Verification is `./excer check` (static) plus `./excer prove <feature>` (drives the real app on a simulator and captures evidence).
8. Words come from `CONTEXT.md`. The product noun is Condition, not Rule.

## Invariants

These never change without an ADR, because shipped installs, the native extensions and the server depend on them byte for byte: persisted storage keys and versions, analytics event names and properties, App Group keys, deep links, notification identifiers, and server API contracts.
