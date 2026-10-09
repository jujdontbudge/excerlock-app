# ExcerLock

ExcerLock is an iOS app: people set Conditions (walk, go to the gym) that must be met before their distracting apps unlock. Agents start with [`AGENTS.md`](AGENTS.md).

- **iOS app:** [`app-next/`](app-next).
- **API:** [`server/`](server), deployed with [`deploy/README.md`](deploy/README.md).
- **Website:** [`site/`](site).

`main` is the release source. App Store binaries and OTA updates come from verified commits on `main`; publishing follows [`docs/agents/operations.md`](docs/agents/operations.md).

## Local checks

Use npm 11.19.0 (pinned in `package.json` and CI); npm 10 resolves the workspace overrides differently and rejects the lockfile.

```sh
npm ci
./excer check
```
