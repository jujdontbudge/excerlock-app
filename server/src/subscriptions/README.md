# Adapty subscription mirror

This module accepts already-authenticated Adapty webhook envelopes and mirrors
only access state for active accounts. `profile_event_id` is the delivery key;
the server deliberately does not retain webhook bodies, profile identifiers,
transaction identifiers, price, currency, attribution, IP addresses, or user
attributes.

The mirror compares Adapty's business `event_datetime`, rather than delivery
arrival time, so a delayed older lifecycle event cannot overwrite a newer
access decision. The delivery key independently handles exact retries.

The user row is locked before recording a delivery. Account deletion uses the
same row lock through its upsert, so the two transactions serialize:

- if the webhook wins, deletion removes the state mirror and nulls the event's
  user link;
- if deletion wins, the webhook records only its opaque delivery key and event
  type, and cannot recreate the user or subscription state.

The delivery ledger survives account deletion so Adapty retries, renewals, and
refunds remain idempotent. Apple billing is not cancelled by either the webhook
or account deletion.

The receiver fails closed with `503` until `ADAPTY_WEBHOOK_SECRET` is set to
the exact Authorization value configured in Adapty. This secret is independent
from `ADAPTY_SECRET_KEY`, which authorizes server-side profile erasure.
