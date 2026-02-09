# Shipping a SaaS With a Team of AI Agents

*I typed maybe thirty words. Five agents wrote 1,200 lines of production code.*

---

**February 2026 | AI Development**

Six months ago I [argued software into existence](https://beatrider.app/devlog/arguing-software-into-existence.html) — a rhythm game, built by talking to Claude, never opening an IDE. That was a toy. This time I tried something harder: taking a real app my family uses every day and turning it into a production multi-tenant SaaS.

The app is [What's On The Menu](https://whatsonthemenu.app). If you have kids, you know the nightly friction — parents staring at the fridge wondering what to make, kids rejecting whatever shows up on their plate. The app removes that friction from both sides. Parents curate a library of foods their family actually eats, build menus from those options, and kids pick what they want from parent-approved choices. No more negotiating at the dinner table. Everyone gets agency.

It started as a single-family JSON-file-on-disk prototype. The goal was to make it work for *any* family: PostgreSQL, authentication, tenant isolation, the whole production stack. Five phases of work.

I want to tell you about Phase 5, because that's where it got surreal.

## What I Actually Typed

Phase 5 was "Polish & Launch Prep" — nine items that stand between a working app and something you'd actually let strangers use. Rate limiting. Input validation. Structured logging. Error handling. Loading spinners. A landing page. Legal pages. Automated backups. Monitoring documentation.

Here is, roughly, my complete input for the entire phase:

1. "let's start on phase 5"
2. I answered four multiple-choice questions Claude asked me. Where should backups go? *Local directory.* What kind of landing page? *Simple hero + CTA.* Terms of service? *Placeholder.* Logging library? *Pino.*
3. I approved the plan Claude wrote.
4. "commit and push"

That's it. That's what I typed. Everything else — the architecture, the code, the file organization, the agent coordination — was Claude.

## What Claude Actually Did

When I said "let's start on phase 5," Claude didn't just start coding. It entered a planning mode. It read my codebase — the middleware stack, the route files, the frontend auth flow, the Docker setup, the package.json. It asked me those four questions where my preferences actually mattered. Then it wrote a detailed implementation plan with file ownership boundaries and asked me to approve it.

After I approved, Claude installed the dependencies (`express-rate-limit`, `zod`, `pino`, `pino-http`), created a team with a shared task list, and spawned five agents:

| Agent | Task | Files |
|-------|------|-------|
| backend-infra | Logging, rate limiting, error handling | `server/index.ts`, `server/logger.ts`, `server/middleware/errorHandler.ts` |
| validation | Zod schemas for all routes | `server/validation/schemas.ts`, all 6 route files |
| frontend-polish | Spinners, landing page, legal pages | `src/App.tsx`, auth pages, 3 new page components |
| backup-scripts | Backup system | `scripts/backup.sh`, `docs/BACKUP.md` |
| docs-monitoring | Documentation | `docs/PLAN.md`, `docs/MONITORING.md` |

Five agents, twenty files, strict ownership — no two agents touching the same file.

I watched them work. The backend-infra agent was adding pino middleware and rate limiters to `server/index.ts` while the validation agent was writing zod schemas and wiring them into six route files. The frontend agent was creating a landing page and adding loading spinners while the docs agent was writing monitoring guides. All at the same time.

The lead agent — Claude — monitored the task list, nudged an unresponsive agent, and when one agent went fully AWOL, Claude just did that task itself. Project management, delegation, and fallback handling. I didn't intervene.

Build passed. Twenty-two files changed. 1,185 lines added.

## What Agent Teams Are

[Claude Code agent teams](https://code.claude.com/docs/en/agent-teams) let you spin up multiple Claude instances that work in parallel on a shared task list. One session acts as the team lead — it creates tasks, spawns teammates, and coordinates. Each teammate gets its own context window and works independently.

The key architectural decision Claude made (not me) was **file ownership**. Every file gets exactly one agent. Two agents editing the same file means overwrites. Claude drew those boundaries in the plan, I glanced at the table, and said "approved." The constraint is simple but it's the thing that makes parallelism work.

## Earlier: Phase 3

Phase 5 wasn't the first time. In Phase 3, Claude used the same pattern to add authentication and multi-tenancy — magic link email login, session management, auth middleware, tenant scoping across six route files, kid PIN migration, and four new frontend screens. Five agents, about three minutes of wall-clock time.

That one had integration bugs. One agent made `authenticateParent` async while another agent was calling it without `await`. Another agent changed a function signature that a third agent depended on. Classic multi-developer coordination problems. Claude fixed them in about two minutes.

By Phase 5, the pattern was refined. Zero integration issues. The agents had learned (or rather, Claude had learned how to prompt them better).

## The Cognitive Shift

Here's what's strange about the experience. When you're managing five agents, you're not thinking about code at all. You're not thinking about how to implement rate limiting or what a zod schema looks like. You're thinking about *which files* rate limiting touches, *who else* touches those files, and *what order* things need to happen.

You're making architectural decisions and taste calls. Should backups go to S3 or local disk? Should the landing page be elaborate or minimal? Should we use pino or structured console.log? These are the decisions that actually require a human — the ones where there's no objectively correct answer, just tradeoffs and preferences.

Everything else — the implementation, the boilerplate, the consistency across twenty files — is exactly the kind of work AI should be doing.

## The Numbers

Starting from a working single-tenant prototype:

| Phase | What | Approach | My Input |
|-------|------|----------|----------|
| 1 | Production infrastructure | Single agent | A conversation |
| 2 | PostgreSQL migration | Single agent | A conversation |
| 3 | Auth & multi-tenancy | 5-agent team | Approved a plan |
| 4 | Seed food library | Single agent | Approved a plan |
| 5 | Polish & launch prep | 5-agent team | 4 multiple-choice answers |

The app is now running in Docker with PostgreSQL, multi-tenant isolation, magic link auth via Resend, 46 seeded foods per household, rate limiting, zod validation on every route, pino structured logging, a global error handler, a landing page, legal pages, automated backups, and monitoring documentation.

I set up my family's account. Two kid profiles, a menu, 54 foods. It works. The magic link email arrived in my inbox. The food library was pre-populated on signup. My kids can pick their dinners.

## The Bigger Picture

Last August I wrote that AI had made "disposable software" viable. Six months later I [refactored the disposable monolith into proper modules](https://beatrider.app/devlog/refactoring-the-monolith.html), also with agent teams, also in about an hour. This time I went further: not a toy, not a refactor, but a production SaaS from scratch.

The pattern that's emerging is less about AI writing code and more about AI doing the *job*. Claude didn't just generate functions — it explored my codebase, identified what needed to change, designed an architecture, asked me the right questions, created a project plan, delegated work to a team, managed that team, handled failures, ran the build, and reported the results. I made maybe five decisions across the entire phase.

The skill that matters isn't knowing how to implement express-rate-limit. It's knowing that you *should* have rate limiting, that auth routes need stricter limits than general API routes, and that your 404 handler should return JSON instead of HTML. Architectural judgment. Product sense. Knowing what "done" looks like.

The agents write the code. You decide what's worth building.

---

*[What's On The Menu](https://whatsonthemenu.app) is live. Agent teams are documented at [code.claude.com](https://code.claude.com/docs/en/agent-teams). This post was drafted by Claude based on the actual session transcripts — seems only fair to mention that too.*
