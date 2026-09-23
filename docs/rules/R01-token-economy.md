# R01 — Token economy

> Detail of **R1** in [`AI_RULES.md`](../../AI_RULES.md). The owner pays for every token; this is
> the highest-leverage rule in the repo.

## Why

Ported from the project this pipeline came from, where per-commit review agents cost ~2M tokens
in a single session and almost nothing shipped. The lesson generalised: **most tokens are wasted
on narration, on re-reading, and on pasting output nobody needs.** Cutting those is free quality.

## The rules

- **Answer first.** One or two sentences with the result, then only what changes the next action.
  A short summary at the end: what changed, what it means, what is open. Long form *only* when the
  owner asks for an analysis.
- **No narration.** Do not describe what you are about to do between tool calls, do not recap the
  process, do not restate rules back to the owner.
- **Never paste long output.** Summarise logs, diffs and query results; show the one line that
  matters. Use `pytest -q --tb=short`, `grep -c`, `| tail`, `--stat`.
- **Read the minimum.** Grep before reading; `offset`/`limit` on big files; never re-read a file
  you just read or edited (the harness already tracks its state). Batch independent tool calls in
  one message.
- **Browser proof:** one screenshot per behaviour, reduced scale; prefer page text / element
  search over a full accessibility snapshot.
- **Subagents** only where the task is broad or a review is owed (R2). Tight brief in, short
  answer (~20 lines) out. Default model sonnet; opus only for Tier C.
- **A recurring lesson becomes a guard test (R3)**, not a longer memory line and not a longer
  file. A guard costs zero tokens per session; a memory line is re-read every session.
