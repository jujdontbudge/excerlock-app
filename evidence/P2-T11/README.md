# P2-T11 evidence

Text lives here and is committed; screenshots (`screens/`), recordings (`recordings/`), the harness export
(`harness/`) and the pulled logs (`*.log`) stay local and are ignored by git.

Fill `RESULTS.md` after the sitting using this table; one row per log file name from the runbook's
scenario index:

```markdown
| Scenario | Result | Date | iOS | Device | Build | Note |
| --- | --- | --- | --- | --- | --- | --- |
| fresh-install-onboarding | pass | 2026-09-xx | 26.x | iPhone 17 Pro | abc1234 | |
```

`verify.txt` is the verifier's output (`node app-next/scripts/verify-device-run.js evidence/P2-T11`).
