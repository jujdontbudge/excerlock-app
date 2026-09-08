# Rendered accessibility audits

`assertAccessible` traverses native render output and verifies interactive roles and names, the `accessible` flag VoiceOver needs to focus a custom control, numeric adjustment actions/value text, progress ranges and labels on editable text inputs. The source ESLint rule catches controls missing both role and label, which a role-only query would miss.

`screenRegistry` lists every shipping screen as a URL into the real `app/` route files plus the demo scenario (and store preparation) that puts it in a representative state. `__tests__/screens-a11y.test.tsx` mounts each entry and audits it, and fails when a route file under `app/` has no entry, so a new screen registers itself here to ship. Preview and scenario matrix tests use the same audit.
