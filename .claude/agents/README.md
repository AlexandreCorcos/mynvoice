# Review team — MYNVOICE

Invoked with `Agent(subagent_type: "<name>")`. When each runs: AI_RULES **R2**
(`docs/rules/R02-delivery-pipeline.md`). In short: **once per unit of work, at the push to
`main`, only for Tier C.** Never per commit — per-commit review is what burned ~2M tokens in the
project this was ported from.

There is no staging: local is the validation stage. The review team runs locally, before the push.

| Agent | Model | Runs when |
|---|---|---|
| `qa-engineer` | sonnet (opus for money) | Tier C push; reproducing a bug |
| `code-reviewer` | sonnet; opus when the change is Tier C | Tier C push (GO / NO-GO) |
| `security-engineer` | opus | Tier C touching auth, isolation, money, storage, public endpoints |
| `db-architect` | sonnet | before a migration or a new filtered query; Tier C touching `alembic/` or `models/` |

Shared contract (each agent file repeats the essentials):
- Read `docs/architecture/SYSTEM_CONTEXT.md` and your own checklist. Not the whole AI_RULES.
- Confirm in the code or the DB before asserting. Evidence, never "should work".
- Answer in **at most ~20 lines**: verdict, must-fix with `file:line`, what you verified.
- Receipts are recorded only on approval, for the exact tree reviewed:
  `bash .claude/hooks/quality-gate record qa|review`. Any edit afterwards voids them (new tree).
- Obvious fix → fix it (with its test). Product / isolation-widening decision → report it for the owner.
