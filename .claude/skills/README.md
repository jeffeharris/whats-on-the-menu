# Skills

This project has no project-specific skills.

The Runware image and vector skills that used to live here moved to
**`github.com/jeffeharris/claude-skills`** and are symlinked into
`~/.claude/skills/`, so they are available here and in every other project
without being tracked in any of them:

```sh
git clone git@github.com:jeffeharris/claude-skills.git ~/projects/claude-skills
~/projects/claude-skills/install.sh
```

They were tracked here *and* in `feltbound`, byte-identical, kept in step by
nothing. The vendoring record — upstream `Runware/runware-skills` pinned at
`595afb9`, and the note that it carries no LICENSE — moved with them and is now
`RUNWARE_SUITE.md` in that repo.

**Add a skill here only if it depends on this repo's layout.** Anything reusable
belongs in the shared repo, or the duplication starts over.
