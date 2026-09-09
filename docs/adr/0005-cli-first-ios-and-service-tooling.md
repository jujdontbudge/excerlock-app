---
status: accepted
date: 2026-09-09
---

# 0005: Prefer CLIs for iOS and service operations

## Decision

Use installed CLIs as the default interface for Xcode, TestFlight and service operations. Use asc for App Store Connect, structured Xcode workflows, signing and TestFlight; native xcodebuild and xcrun tools cover discovery and unsupported operations. Use simctl for simulator lifecycle and idb for accessibility-driven interaction. Read task-specific instructions on demand rather than enabling additional MCP catalogs by default.

## Context

The user wanted agents fluent in Xcode and TestFlight while preferring CLIs and minimizing context. On 2026-09-09, Xcode 26.4.1 and asc 5.1.0 were installed; asc's Xcode doctor passed, authenticated app listing succeeded, and Recovi's two TestFlight groups were readable. simctl, devicectl, xcresulttool and idb were available. These checks verified tooling and account access, not an ExcerLock build, signed export, upload or device activation.

A machine-local guide at `/Users/johansardar/.local/share/agent-ios/GUIDE.md` was routed from global and project instructions. Service-specific commands and authentication limitations are documented separately in the service guide.

## Consequences

Agents can discover actual schemes and destinations, build and test with result bundles, diagnose failures and run authorized release workflows without a new MCP. A CLI being installed does not prove every service is authenticated. Check installed command help and account access before operations. Preserve release locks and task authorization. Simulator work stays headless unless the user requests the UI; Maestro remains banned. Machine-local guides require provisioning on other computers.

## References

- [Service CLI guide](../agents/service-cli.md)
- [App Store Connect guide](../agents/app-store-connect.md)
- [Operations and release locking](../agents/operations.md)
- [0004: accepted shared skill policy](0004-share-core-skills-across-agent-clis.md)
