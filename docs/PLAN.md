# What's On The Menu — Public Launch Plan

> Living document. Last updated: 2026-02-08
> Target: **whatsonthemenu.app**

---

## 1. Vision

Transform a single-family meal planning app into a multi-tenant SaaS available at whatsonthemenu.app. Families sign up, get a pre-populated food library, build menus, and let their kids pick meals — all from any device.

---

## 2. Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Auth | Magic link (email only) | Passwordless, simple UX for families |
| Database | PostgreSQL | Relational, multi-tenant isolation, ACID |
| Food library | Seeded copy (~50 items) | Each household gets editable copy of starter foods |
| Images | Local filesystem (defer S3) | Ship faster, migrate to object storage later |
| Kid PIN | Keep per-family PIN in DB | Deterrent, not security. Same UX as today |
| Hosting | Hetzner VPS | Self-managed, Docker + Caddy |
| Reverse proxy | Caddy | Automatic HTTPS, simple config |

---

## 3. Architecture Overview

```
Browser
  |
  | HTTPS (443)
  v
Caddy (TLS termination, routing)
  |
  +---> /api/*      --> Express (port 3001)
  +---> /uploads/*  --> Express (static files)
  +---> /*          --> Express (serves built SPA)
  |
Express
  |
  +--> PostgreSQL (port 5432, internal network)
  +--> data/uploads/ (local filesystem)
```

### Production Stack
- **Caddy 2** — reverse proxy, auto HTTPS
- **Node 22** — Express API + serves built React SPA
- **PostgreSQL 16** — all app data
- **Docker Compose** — orchestration

---

## 4. Implementation Phases

### Phase 1: Production Infrastructure ✓
> Get the current app deployed as-is (single-tenant, JSON storage)

- [x] Create `Dockerfile.prod` (multi-stage build)
- [x] Create `docker-compose.prod.yml` (app + caddy)
- [x] Create `Caddyfile` for whatsonthemenu.app
- [x] Add `/api/health` endpoint
- [x] Update `server/index.ts` to serve SPA in production
- [x] Create `.dockerignore`
- [x] Create `deploy.sh` script
- [x] DNS: Point whatsonthemenu.app to Hetzner VPS
- [x] Deploy and verify HTTPS works

### Phase 2: PostgreSQL & Data Layer ✓
> Replace JSON file storage with PostgreSQL

- [x] Add `pg` dependency, create connection pool (`server/db/pool.ts`)
- [x] Create database schema (`docs/schema.sql`)
- [x] Add PostgreSQL to `docker-compose.prod.yml`
- [x] Create query modules (`server/db/queries/*.ts`)
- [x] Migrate each route from JSON to PostgreSQL:
  - [x] Foods
  - [x] Profiles
  - [x] Menus (active + presets)
  - [x] Selections
  - [x] Meal history + reviews
  - [x] Shared menus
- [x] Write JSON-to-PostgreSQL migration script for existing data
- [ ] Test locally with Docker Compose

### Phase 3: Authentication & Multi-Tenancy ✓
> Add user accounts, households, and tenant isolation

- [x] Create auth tables (users, households, sessions, magic_link_tokens)
- [x] Build magic link flow:
  - [x] `POST /api/auth/login` — send magic link email
  - [x] `GET /api/auth/verify?token=...` — verify token, create session
  - [x] `POST /api/auth/logout` — destroy session
  - [x] `GET /api/auth/me` — get current user
- [x] Add auth middleware (session cookie → household_id)
- [x] Scope ALL API routes to `household_id`
- [x] Create signup flow (new household + seed foods)
- [x] Move kid PIN from localStorage to DB (per household)
- [x] Build login/signup UI screens
- [x] Email service integration (Resend, Postmark, or SES)

### Phase 4: Seed Food Library ✓
> Curate starter foods with images for new signups

- [x] Curate ~50 kid-friendly foods across categories
- [x] Create/source common food images (or use AI generation)
- [x] Create `seed_food_templates` table + seed data SQL
- [x] Build `initialize_household_foods()` function
- [x] Test signup → verify seed foods appear in library

### Phase 5: Polish & Launch Prep
> Harden for public use

- [ ] Rate limiting (Express middleware)
- [ ] Input validation (zod on API routes)
- [ ] Error handling improvements (structured error responses)
- [ ] Loading states for auth flows
- [ ] Landing page / marketing page (optional)
- [ ] Terms of service / privacy policy page
- [ ] Automated backups (PostgreSQL + uploads)
- [ ] Uptime monitoring (UptimeRobot or similar)
- [ ] Log aggregation

### Phase 6: Future Enhancements
> Post-launch improvements

- [ ] S3/R2 for image storage (replace local filesystem)
- [ ] Household sharing (invite co-parent via email)
- [ ] Push notifications (meal time reminders)
- [ ] PWA support (installable, offline basics)
- [ ] Analytics dashboard (popular foods, eating trends)
- [ ] CI/CD pipeline (GitHub Actions → auto-deploy)

---

## 5. Database Schema

### Entity Relationship Summary

```
households (tenant root)
  ├── users (auth, magic link)
  │   ├── sessions
  │   └── magic_link_tokens
  ├── food_items (seeded on signup, fully editable)
  ├── kid_profiles
  ├── menus (active + saved presets)
  │   └── kid_selections (per menu session)
  ├── meal_records (history)
  │   ├── meal_selections (snapshot)
  │   └── meal_reviews (completion + stars)
  └── shared_menus
      └── shared_menu_responses

seed_food_templates (global, copied to new households)
```

### Key Tables

**households** — tenant root, stores kid_pin
**users** — email-based auth, belongs to household
**sessions** — httpOnly cookie sessions (30 day expiry)
**magic_link_tokens** — one-time login tokens (15 min expiry)
**food_items** — per-household food library (seeded from templates)
**kid_profiles** — per-household kid profiles with avatars
**menus** — active menu (one per household) + saved presets (4 slots)
**kid_selections** — kid picks for current active menu
**meal_records** — historical meal log
**meal_selections** — snapshot of what kids picked (survives deletions)
**meal_reviews** — parent review of each kid's meal (completions + stars)
**shared_menus** — public shareable menus with token-based access
**seed_food_templates** — global template foods copied on signup

### Design Principles

- **Tenant isolation**: Every query scoped to `household_id`
- **JSONB for nested data**: Menu groups, selections, completions stored as JSONB (flexible, avoids over-normalization)
- **Historical integrity**: Meal history snapshots kid names (survives profile deletion)
- **Legacy ID support**: `legacy_id` columns for migration from JSON format
- **Row Level Security**: Optional but recommended defense-in-depth
- **Auto-updating timestamps**: Trigger-based `updated_at` on all tables

Full schema: `docs/schema.sql` (created in Phase 2)

---

## 6. Authentication Flow

### Magic Link Login

```
1. User enters email on login page
2. POST /api/auth/login { email }
3. Server creates magic_link_token (64 char, 15 min expiry)
4. Server sends email: "Click to log in: whatsonthemenu.app/auth/verify?token=xxx"
5. User clicks link
6. GET /api/auth/verify?token=xxx
7. Server validates token (exists, not expired, not used)
8. Server marks token as used
9. Server creates session (30 day expiry)
10. Server sets httpOnly cookie with session token
11. Redirect to dashboard
```

### Signup Flow

```
1. User enters email on signup page
2. POST /api/auth/signup { email, householdName }
3. Server creates household
4. Server creates user (linked to household)
5. Server calls initialize_household_foods(household_id)
6. Server sends magic link email
7. Same verification flow as login
```

### Session Management

- **Cookie**: `session_token` — httpOnly, secure, SameSite=Lax
- **Expiry**: 30 days, refreshed on activity
- **Cleanup**: Cron job deletes expired sessions/tokens

---

## 7. Deployment Configuration

### Caddyfile

```
whatsonthemenu.app {
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Frame-Options "SAMEORIGIN"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
        -Server
    }

    handle /api/* {
        reverse_proxy app:3001
    }

    handle /uploads/* {
        reverse_proxy app:3001
    }

    handle {
        reverse_proxy app:3001
    }
}

www.whatsonthemenu.app {
    redir https://whatsonthemenu.app{uri} permanent
}
```

### Docker Compose (Production)

3 services:
- **db**: PostgreSQL 16 Alpine, persistent volume, health check
- **app**: Multi-stage Node 22 build, depends on db, serves API + SPA
- **caddy**: Caddy 2 Alpine, ports 80/443, auto HTTPS

### Dockerfile (Production)

Multi-stage:
1. **frontend-builder**: `npm ci` + `npm run build` → `dist/`
2. **runtime**: `npm ci --omit=dev`, copy `dist/` + `server/`, non-root user, tini for PID 1

---

## 8. Seed Food Library

~50 starter foods across categories. Each new household gets a full copy.

### Categories & Examples

**Protein**: Chicken Nuggets, Grilled Chicken, Hot Dog, Turkey Slices, Fish Sticks, Scrambled Eggs, Hard Boiled Egg, Meatballs, Peanut Butter, Black Beans

**Grain**: Mac & Cheese, Rice, Pasta, Toast, Pancakes, Waffles, Tortilla, Crackers, Oatmeal, Bagel

**Veggie**: Broccoli, Carrot Sticks, Cucumber Slices, Corn, Green Beans, Peas, Sweet Potato, Celery, Bell Pepper Strips, Cherry Tomatoes

**Fruit**: Apple Slices, Banana, Strawberries, Grapes, Orange Slices, Blueberries, Watermelon, Pineapple, Mango, Raisins

**Dairy**: Yogurt, Cheese Stick, Milk, Cottage Cheese

**Breakfast** (cross-tagged): Cereal, Granola Bar

Full seed data inserted via `seed_food_templates` table. Images sourced/generated separately.

---

## 9. Migration Strategy (Existing Data)

For the current single-family instance:

1. Create a household + user for the existing family
2. Map JSON food IDs → `food_items.legacy_id` (preserves references)
3. Map JSON profile IDs → `kid_profiles.legacy_id`
4. Convert menu JSON → `menus` table (preserve group structure in JSONB)
5. Convert selections → `kid_selections` table
6. Split meal history into `meal_records` + `meal_selections` + `meal_reviews`
7. Copy uploaded images to new volume
8. Verify data integrity, then switch over

Script: `scripts/migrate-json-to-postgres.ts`

---

## 10. Open Questions / Future Decisions

- **Email provider**: Resend vs Postmark vs SES for magic links?
- **Image strategy**: When to migrate to S3/R2? What storage quota per household?
- **Landing page**: Build custom or use a template? Separate from app?
- **Pricing**: Free tier? Paid plans? (probably free for now)
- **Analytics**: Any tracking needed? Privacy-first approach?
- **Household sharing**: How to invite a co-parent? Separate user roles?
