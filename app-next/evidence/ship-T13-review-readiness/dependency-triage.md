# Dependency audit triage — 2026-09-10

`npm audit --json` exited 1 against the existing lock/install: 43 vulnerable package nodes (3 high, 40 moderate, 0 critical). Raw result: `npm-audit.json`. No package or lock file was changed in T13.

## Release-significant findings

- **Direct `@clerk/clerk-expo` high** (`GHSA-w24r-5266-9c3c`, affected through 2.19.35): authorization bypass concerns organization/billing/reverification checks. ExcerLock's rebuilt client uses Supabase, but the legacy workspace retains Clerk; remove/upgrade through a root-owned dependency change. Do not represent the repository as audit-clean.
- **Transitive `@xmldom/xmldom` high**: multiple XML injection and resource-exhaustion advisories through Expo plist / `react-native-device-activity` build tooling. The dependency is used during trusted native project generation rather than parsing remote XML in the shipped app, reducing runtime exposure, but malicious/untrusted plist input would matter. Fix suggestions are semver-major root dependency upgrades and require prebuild/native regression testing.
- **Transitive `nanoid` high**: zero-size custom-generator infinite-loop advisory. No identified ExcerLock call uses that API shape; upgrade remains required at the owning dependency layer.
- **Direct Fastify moderate**: schema coercion and some `trustProxy` configurations. Server configuration and request schemas require owner review; npm reports a non-major fix available.
- **Vitest moderate** is test tooling arbitrary file read; fixed release is a major upgrade according to npm. It is not bundled into the iOS app.
- Remaining moderate chains include Expo build tooling, old Drizzle tooling, Solana dependencies in legacy workspace code, router query parsing, `uuid`, and `stream-json`. Their presence still blocks an unqualified dependency-security green claim.

Root should split production/server, legacy workspace, and build-only upgrades rather than run `npm audit fix --force`; T13 was not authorized to change dependencies.
