# Routes

This module owns the `/v1/*` Fastify transport for health, support, user, and
vendor endpoints. Handlers validate transport data and delegate; they contain
no earning, ledger, shield, or lock decisions.

Vendor route boundaries:

- Public: OAuth callbacks and verified webhook challenge/delivery endpoints.
- Clerk protected: connect, disconnect, and device event-feed endpoints.
- The webhook plugin alone replaces Fastify's JSON parser so signature checks
  receive the exact request bytes. That parser is encapsulated and cannot
  alter unrelated API routes.
- Provider/configuration errors are mapped to explicit 4xx/5xx response codes;
  no missing credential is silently ignored.

Route fixtures use `fastify.inject()`:

```sh
npm run test:server
```
