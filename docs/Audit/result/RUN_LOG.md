# Run log

One row per audit run, **newest first**. Append here at the end of every run — a run that is not
recorded did not happen, because the next person cannot tell whether a surface has ever been looked at.

| Date (UTC) | Playbook | Target | Verdict | Report |
|---|---|---|---|---|
| 2026-07-30 | unauth-blackbox *(external tool, pre-dating this structure)* | prod | 11 findings · 9 fixed, 2 open (Cloudflare) | [archive](../archive/unauth_blackbox_external_2026-07-30.md) |

## Verdict shorthand

- `PASS` — every test in the playbook passed.
- `PASS · N fixed` — issues found, all of them plain errors, all fixed and re-tested in the same run.
- `FAIL` — at least one finding is still open. Say which in the report.
- `BLOCKED` — the run could not complete. Say what stopped it.

Anything that leaked one account's data to another is **CRITICAL** and is always `FAIL`, whatever else
passed.
