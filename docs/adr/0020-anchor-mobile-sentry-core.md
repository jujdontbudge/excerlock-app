---
status: proposed
date: 2026-09-10
---

# 0020: Anchor the mobile Sentry core at the workspace root

## Decision

Declare the exact `@sentry/core` version owned by `@sentry/react-native` as a production dependency
of the workspace root. Keep the mobile SDK versions and the server `@sentry/node` version unchanged;
do not use npm overrides, aliases, deep imports, nested installs, or Metro optimization flags. Verify
that every mobile Sentry package resolves the one root core while every server package resolves the
exact core version declared by its owning SDK family.

Keep the anchor in `dependencies`, not `devDependencies`, because production installs may use
`npm ci --omit=dev`. A production install must not remove a module required by the mobile runtime.

## Context

The npm workspace previously placed the newer server core at the root. Exact dependencies in the
mobile Sentry family then produced eight byte-identical nested copies of its older core, and Metro
included multiple copies in the iOS bundle. An npm-supported direct root dependency gives the mobile
family its exact shared version and moves the incompatible server core below its owners without
changing either SDK family.

The resulting measured iOS bundle is still above the decimal 4,000,000-byte release limit. This
decision removes accidental dependency duplication; it does not relax the size gate or adopt Expo's
experimental tree-shaking and graph optimization flags.

## Consequences

The mobile graph has one physical core copy and a smaller bundle. The server family retains nested
copies of its exact core, so disk installation size may increase even though the mobile bundle shrinks.
Future Sentry upgrades must update the root anchor with the mobile SDK's declared exact core version.
A topology regression derives both expected versions from the installed owning package manifests so
server upgrades do not require a hardcoded test-version edit.

## References

- `package.json`
- `package-lock.json`
- `scripts/sentry-core-topology.test.cjs`
- `app-next/scripts/verify-bundle-size.cjs`
- `app-next/scripts/verify-no-dev-bundle.cjs`
- `../../plans/ship/T15-performance.md`
