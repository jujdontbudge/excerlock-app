# Onboarding

OnboardingRoute owns a persistent shell and composes screen bodies by step. The flow machine is pure in src/onboarding. Continue and Back change the current route parameter, keeping the header and the grouped dot/loop scenes mounted. Answers persist as they change; headings and errors crossfade, controls give touch feedback, and each body has its own reveal.

No real permissions, analytics or purchase SDKs are imported here. Runtime ports remain the IO boundary. Copy and choices live in src/content.
