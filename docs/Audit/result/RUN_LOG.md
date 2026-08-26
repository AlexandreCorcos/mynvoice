# Run log

One row per audit run, **newest first**. Append here at the end of every run — a run that is not
recorded did not happen, because the next person cannot tell whether a surface has ever been looked at.

| Date (UTC) | Playbook | Target | Verdict | Report |
|---|---|---|---|---|
| 2026-08-26 | marathon (1–5, all playbooks) | local → prod | 12 fixed & live (v0.23.6–0.23.13); 1 owner infra action open (L6 wildcard) | [file](marathon_2026-08-26.md) |
| 2026-08-26 | 1 account-isolation | local → prod | **FAIL → 2 CRITICAL fixed** (v0.23.6, v0.23.7) | [file](marathon_2026-08-26.md) |
| 2026-08-26 | 2 money-invoice-integrity | local → prod | PASS · 2 fixed (v0.23.8, v0.23.10 numbering race) | [file](marathon_2026-08-26.md) |
| 2026-08-26 | 3 session-csrf-admin-stepup | local → prod | PASS | [file](marathon_2026-08-26.md) |
| 2026-08-26 | 4 unauth-blackbox | prod | PASS · low-sev enumeration + wildcard notes | [file](marathon_2026-08-26.md) |
| 2026-08-26 | 5 input-robustness | local → prod (narrowed) | PASS · 1 fixed (v0.23.9) | [file](marathon_2026-08-26.md) |
| 2026-07-30 | unauth-blackbox *(external tool, pre-dating this structure)* | prod | 11 findings · 9 fixed, 2 open (Cloudflare) | [archive](../archive/unauth_blackbox_external_2026-07-30.md) |

## Verdict shorthand

- `PASS` — every test in the playbook passed.
- `PASS · N fixed` — issues found, all of them plain errors, all fixed and re-tested in the same run.
- `FAIL` — at least one finding is still open. Say which in the report.
- `BLOCKED` — the run could not complete. Say what stopped it.

Anything that leaked one account's data to another is **CRITICAL** and is always `FAIL`, whatever else
passed.
