---
name: pickup
description: Resume safely from the current branch's handoff by verifying its state and resolving repository-answerable questions, then propose a plan without editing. Use when the user explicitly asks to pick up or resume handed-off work, continue from a handoff, or invokes $pickup.
---

# Pick up from a branch handoff

Inspect and verify the handoff for the current branch. Do not edit files or
start implementation in this turn. End with a plan and only genuinely blocked
questions.

## Workflow

1. Derive the branch with `git branch --show-current`, replace `/` with `-`, and
   read `docs/handoffs/<current-branch-slug>.md`. If no branch is checked out or
   the file is missing, report that and stop; do not infer the task from the
   branch name.
2. Read every path under the handoff's "Files that matter." Inspect the files
   directly instead of relying on the handoff's characterization.
3. Resolve every open question, including those labeled as needing the user.
   Search files and history, run safe read-only commands, query local databases,
   or inspect workflow conditions as appropriate. Mark each question
   `ANSWERED`, with evidence, or `BLOCKED`.
4. Verify each state claim by rerunning the command named in the handoff.
   Identify claims that no longer hold because the tree has changed.
5. Recheck the "Ruled out" evidence. Honor it when it still holds; identify
   decisions whose underlying evidence has changed.

## Output

Return these sections in order:

1. **Task** — one sentence.
2. **State** — verified results and the commands used.
3. **Questions answered from the repo** — question, answer, and evidence.
4. **Genuinely blocked** — only issues no repository evidence or safe command
   can settle. Say plainly when there are none.
5. **Plan** — the first three concrete steps with file paths.
6. **Recommended execution mode** — one choice and one-line rationale.

Then stop and wait for confirmation before modifying anything.

## Choose an execution mode

- **Straight execution** — use when the handoff names the files and change and
  the work is mechanical. This is the default when the next step already names
  a file and edit.
- **`$feature-dev`** — use for a new subsystem or multi-layer change whose
  structure remains genuinely unsettled.
- **`/plan`** — use when two or three approaches need comparison before choosing
  one and the handoff does not narrow the choice.
- **`/review` first** — use when the handoff says implementation is complete but
  remains unverified.
