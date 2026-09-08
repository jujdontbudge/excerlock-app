# __tests__

`sentry.test.ts` covers the option policy and the scrub, and ends on the assertion that matters:
a scrubbed payload built from a gym-shaped error mentions no gym, address, email or coordinate.

`reportError.test.tsx` renders a throwing child inside the real `AppErrorBoundary`, so the wiring
from a render error to `captureException` is exercised rather than assumed.
