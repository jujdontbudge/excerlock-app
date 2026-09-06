# dev

Owns the local dev module. Keep product copy in src/content, styles in design tokens, and service access behind runtime ports.

Repeatable local controls can be combined in deep links: `excerlock://dev?scenario=trial-expired&restore=restored`, `&outcome=error`, or `&prompt=deny`. Values are whitelisted and applied after the scenario load; they never invoke external services.
