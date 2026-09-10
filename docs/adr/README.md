# Architecture decision records

## Index

- [0001: Coordinate releases and retire agent work conservatively](0001-coordinate-releases-and-retire-agent-work.md) — **accepted**.
- [0002: Minimal default agent context](0002-minimal-agent-context.md) — **accepted**, scoped to lean Codex/Claude by 0004.
- [0003: Four explicit on-demand skills](0003-four-on-demand-skills.md) — **superseded** by 0004.
- [0004: Share core skills across agent CLIs](0004-share-core-skills-across-agent-clis.md) — **accepted**.
- [0005: Prefer CLIs for iOS and service operations](0005-cli-first-ios-and-service-tooling.md) — **accepted**.
- [0006: Route web extraction by source type](0006-route-web-extraction-by-source-type.md) — **accepted**.
- [0023: Honest release reviewer preset](0023-reviewer-preset.md) — **accepted**.

## Recording decisions

Every core architectural decision belongs here in a short file explaining what was decided, why, and the project's state when the decision was made. Document the rationale that code cannot explain: constraints, assumptions, meaningful alternatives and consequences.

- Read relevant ADRs before changing architecture; check status rather than treating every historical record as current authority.
- Copy [TEMPLATE.md](TEMPLATE.md) to the next unused `NNNN-short-title.md`. Keep existing numbers stable and use one decision per file.
- Record the decision with the change that makes or implements it. Use `proposed` until settled; `accepted` does not by itself mean implemented. State implementation status in Context and link supporting code, issues or specs.
- Add each ADR to this README's index with its title and current status. References to ADRs should state their status.
- Preserve history: mark a replaced decision `superseded` and link the replacement; use `deprecated` when retired without a replacement. Do not delete or silently rewrite the original rationale.
- Keep records concise. Do not invent past reasons or turn routine coding choices into ADRs.
