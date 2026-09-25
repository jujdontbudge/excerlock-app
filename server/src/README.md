# Server

- `index.ts` is the composition root: it builds Fastify, registers `routes/` and starts the deletion worker.
- `instrument.ts` starts Sentry before anything else loads; `migrate.ts` applies the Drizzle journal.
- `routes/` holds thin transport files: validate, call one package entry, respond.
- `packages/<name>/` holds the concepts in strict layers (`server/.dependency-cruiser.cjs`): root files are public, `lib/` is private.

Verify with `./excer check` (static) and `./excer server smoke` (real Postgres, real HTTP, stubbed vendors).
