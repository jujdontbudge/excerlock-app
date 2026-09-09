# App Store Connect CLI

Source: https://github.com/rorkai/App-Store-Connect-CLI

Installed through Homebrew as `asc`. Use `asc version` and `asc <command> --help` before scripting. The 5.x release removes deprecated 4.x flags; existing skill examples may need canonical replacements (notably `--build-id` instead of `--build`). Migration reference: https://github.com/rorkai/App-Store-Connect-CLI/blob/main/migrate-to-5-0.mdx

Read `/Users/johansardar/.agents/skills/asc-cli-usage/SKILL.md` on App Store Connect tasks. Read additional installed `asc-*` guides only for the specific task (build, signing, TestFlight, review, metadata or crash triage); do not preload the pack. No MCP server is required.

Use existing authentication profiles; select the correct app/team explicitly. Installation is not authorization to upload, submit or change App Store data. Follow `docs/agents/operations.md`, including the shared release lock, for authorized release work. Do not write API keys into the repository.
