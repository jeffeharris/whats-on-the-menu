---
name: handoff
description: Write or update a concise branch handoff for a fresh session, then stop. Use when the user explicitly asks to hand off, save continuation context, prepare work for another session, or invokes $handoff.
---

# Write a branch handoff

Write a handoff so the work can continue in a fresh session, then stop. Do not
start new work.

Derive the current branch with `git branch --show-current`. Replace `/` with `-`
to form its slug, and write `docs/handoffs/<current-branch-slug>.md`. If no
branch is checked out, report that and stop. If the handoff already exists, read
and update it; do not append a second narrative.

## Required document header

Keep an existing `created` date and set `last_updated` to today's UTC date. Use:

```yaml
---
purpose: <one-sentence purpose>
type: guide
created: YYYY-MM-DD
last_updated: YYYY-MM-DD
---
```

## Content

Record only what a fresh session cannot re-derive:

1. **Task and state** — two sentences describing the task and what works versus
   what is broken or unverified.
2. **Decisions made, and why** — one line per load-bearing decision. Mark user
   decisions explicitly so the next session does not relitigate them.
3. **Ruled out, and why** — abandoned approaches and falsified hypotheses, with
   the evidence that eliminated each one.
4. **Files that matter** — one path per line and its role. Do not summarize file
   contents.
5. **Next concrete step** — name the file and change or the measurement to take.
   If it cannot be concrete, state what must be decided first.
6. **Open questions** — split into questions answerable from the repository and
   questions that need the user. Classify a question as needing the user only
   when no file, command, history, or local data can settle it.

## Exclusions

- Omit summaries of file contents and other greppable facts.
- Omit the exploration narrative.
- Omit facts already recorded in repository instructions, memory, or a
  captain's log.
- Omit measurements that do not name the command needed to reproduce them.

## Rules

- Cap the complete file at 40 lines, including the document header. Cut
  narrative before decisions or falsification evidence.
- Make every system-state claim name the command that establishes it.
- Do not claim work is done unless it was verified in this session. Mark
  unverified work as such.
- If work is uncommitted, include the relevant `git status --short` output
  explicitly; another worktree cannot see it and a stash can hide it.
- Do not commit the handoff unless the user separately requests a commit.

Finish by reporting the handoff path and line count, then stop.
