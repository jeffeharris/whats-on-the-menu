# What's On The Menu

A family meal planning web app where parents create menus and children select what they want to eat through a kid-friendly interface.

## Quick Start

### Local Development

```bash
npm install
npm run dev
```

### Docker Development

```bash
docker compose up
```

Configure the port in `.env`:
```bash
PORT=5173
```

## Environment Variables

See `.env.example` for the full list. Commonly used:
- `PORT` - Dev server port (default: 5173)
- `VITE_CLOUDFLARE_WEB_ANALYTICS_TOKEN` - optional public Cloudflare Web
  Analytics site token for the logged-out landing page
- `RUNWARE_API_KEY` - Server-side key for AI image generation
- `IMAGE_GEN_DAILY_LIMIT_HOUSEHOLD` / `IMAGE_GEN_DAILY_LIMIT_GLOBAL` - rolling-24h
  caps on paid image generation (defaults: 50 per household, 1000 overall)
- `IMAGE_GEN_ENABLED=false` - kill switch to stop all paid image generation

## Project Structure

```
src/
├── components/
│   ├── common/     # Shared UI components
│   ├── kid/        # Kid mode components
│   └── parent/     # Parent mode components
├── contexts/       # React Context state management
├── hooks/          # Custom React hooks
├── views/          # Page-level views
├── types/          # TypeScript type definitions
└── utils/          # Utility functions
```

UI foundations and contribution conventions are documented in
[`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md).

Product personas, user flows, and the first-meal golden path are documented in
[`docs/USER_PERSONAS_AND_FLOWS.md`](docs/USER_PERSONAS_AND_FLOWS.md).

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm test` - Run the server integration test suite (requires a test Postgres)
- `npm run migrate` - Apply pending database migrations

## Testing

Server integration tests (tenant isolation, auth, uploads, migrations) run
against a **real, throwaway** Postgres — never the dev or production database. A
safety guard refuses to run unless the target database name contains `test`.

```bash
# Spin up a disposable Postgres with the schema loaded
docker run -d --name wotm-test-db \
  -e POSTGRES_DB=whatsonthemenu_test -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres \
  -v "$PWD/docs/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql:ro" \
  -p 55432:5432 postgres:16-alpine

# Run the suite
TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:55432/whatsonthemenu_test" npm test

# Tear down
docker rm -f wotm-test-db
```

CI runs the same suite against a Postgres service on every PR and before every deploy.

## Database migrations

`docs/schema.sql` is the baseline; schema changes after it are per-file
migrations in `server/db/migrations/` (`YYYYMMDD_HHMM_slug.ts`). Migrations run
automatically on server startup and via `npm run migrate`. See
`server/db/migrations/README.md`.

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS 4
