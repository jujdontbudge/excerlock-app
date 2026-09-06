# Rendered accessibility audits

`assertAccessible` traverses native render output and verifies interactive roles and names, numeric adjustment actions/value text, and progress ranges. The source ESLint rule catches controls missing both role and label, which a role-only query would miss. It is used by preview and scenario screen matrix tests.
