# ExcerLock architecture

ExcerLock has one shape everywhere: five nouns, each with one folder and one job. A folder tells you where code runs and which imports are legal. The rules below are enforced by `./excer check`; if the check passes, the shape is right.

## The five nouns

| Noun | Folder | Job | May import |
|---|---|---|---|
| Route | `app-next/app/**` | One screen a user can open. Parses params, renders one package screen. | Package entry points only. |
| Package | `app-next/src/packages/<name>/` | One product concept (conditions, progress, lock, subscription, …). | Other packages' entry points, lower layers only. |
| Adapter | `<package>/lib/native/*` (real iOS or SDK), `<package>/testing.ts` (demo fake) | Satisfies a package's port. | Its own package, platform SDKs. |
| Extension | `app-next/targets/*`, `app-next/modules/*` | Native Swift code; the Screen Time extensions run in separate iOS processes. | Shares data with JavaScript only through `packages/enforcement/contract.ts` (the App Group schema). |
| Composition root | `app-next/src/packages/runtime/` | Chooses real or fake adapters and starts packages. The only place that wires. | Everything's entry points, including `testing.ts`. |

The server uses the same shape: `server/src/packages/<name>/` for packages, thin route files that validate, call one package and respond, and `server/src/app.ts` as the composition root.

## Package shape

```
src/packages/<name>/
  index.ts        public entry point
  <Screen>.tsx    another public entry point (screens are entry points)
  testing.ts      demo fake; only runtime and dev-harness may import it
  lib/            private implementation; nothing outside the package may import it
```

- A package's public surface is its root files. Anything in a subfolder is private.
- Several small entry files beat one barrel. Never re-export a whole subtree.
- Packages are flat: a package never contains another package.
- A store is private to its package (`lib/`). Other packages call the package's hooks and commands, so every store has one writer.
- Copy lives with its package in `lib/copy.ts`.
- Add a package with `./excer new package <name>`; it creates this shape.

## Rules

1. Import other packages only through their entry points (`app-next/.dependency-cruiser.cjs`, enforced by `./excer check`).
2. No dependency cycles.
3. Layers, bottom to top. A package may import only packages in its own layer or below:
   `calendar, persistence, ui` → `conditions, telemetry, remote-config` → `activity, identity, subscription, app-selection, gyms, treadmill-scan` → `progress, lock, enforcement, notifications, setup, diagnostics, support, preferences` → `reconciler, journey, onboarding` → `home, insights` → `runtime, dev-harness` → routes.
4. `ui` imports no other package.
5. Only `runtime` imports native adapters (`*/lib/native/**`) and native modules (`app-next/modules/*`).
6. No comments in TypeScript or JavaScript (`excerlock/no-comments`). Allowed: `eslint-disable-next-line <rule> -- <reason>`, `@ts-expect-error <reason>`, `/// <reference …>`. Put knowledge in names, types, `CONTEXT.md` or an ADR. Swift is exempt.
7. No tests. Verification is `./excer check` (static) plus `./excer prove <feature>` (drives the real app on a simulator and captures evidence).
8. Words come from `CONTEXT.md`. The product noun is Condition, not Rule.

## Invariants

These never change without an ADR, because shipped installs, the native extensions and the server depend on them byte for byte: persisted storage keys and versions, analytics event names and properties, App Group keys, deep links, notification identifiers, and server API contracts.
