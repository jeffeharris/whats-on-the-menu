-- What's On The Menu — PostgreSQL Schema
-- Phase 2: Data layer (all tables include household_id for Phase 3 multi-tenancy)
-- Applied automatically on first `docker compose up` via PostgreSQL init script

BEGIN;

-- ============================================================
-- Extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- for gen_random_uuid()

-- ============================================================
-- Auto-updating updated_at trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- households (tenant root)
-- ============================================================
CREATE TABLE households (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL DEFAULT 'My Household',
  kid_pin         TEXT,           -- deterrent PIN for kid mode (not security)
  active_menu_id  UUID,           -- FK added below after menus table exists
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER households_updated_at
  BEFORE UPDATE ON households
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- users
-- ============================================================
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  household_id  UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  display_name  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_household ON users(household_id);

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- sessions
-- ============================================================
CREATE TABLE sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- ============================================================
-- magic_link_tokens
-- ============================================================
CREATE TABLE magic_link_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL,
  token       TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_magic_link_tokens_token ON magic_link_tokens(token);

-- ============================================================
-- food_items (per-household food library)
-- ============================================================
CREATE TABLE food_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id    UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  image_url       TEXT,           -- /uploads/xxx.jpg or null
  tags            TEXT[] NOT NULL DEFAULT '{}',
  legacy_id       TEXT,           -- original JSON id for migration
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_food_items_household ON food_items(household_id);
CREATE INDEX idx_food_items_legacy ON food_items(household_id, legacy_id) WHERE legacy_id IS NOT NULL;

CREATE TRIGGER food_items_updated_at
  BEFORE UPDATE ON food_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- kid_profiles (per-household)
-- ============================================================
CREATE TABLE kid_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id    UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  avatar_color    TEXT NOT NULL,   -- red, orange, yellow, green, teal, blue, purple, pink
  avatar_animal   TEXT,            -- cat, dog, bear, bunny, penguin, owl, fox, panda, lion, elephant, frog
  legacy_id       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_kid_profiles_household ON kid_profiles(household_id);
CREATE INDEX idx_kid_profiles_legacy ON kid_profiles(household_id, legacy_id) WHERE legacy_id IS NOT NULL;

CREATE TRIGGER kid_profiles_updated_at
  BEFORE UPDATE ON kid_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- menus (active menu + saved presets, per-household)
-- ============================================================
CREATE TABLE menus (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id    UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name            TEXT NOT NULL DEFAULT 'Menu',
  groups          JSONB NOT NULL DEFAULT '[]',   -- MenuGroup[] (id, label, foodIds, selectionPreset, order, filterTags, excludeTags)
  preset_slot     TEXT,            -- 'breakfast' | 'snack' | 'dinner' | 'custom' | null
  legacy_id       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_menus_household ON menus(household_id);
CREATE INDEX idx_menus_preset ON menus(household_id, preset_slot) WHERE preset_slot IS NOT NULL;
CREATE INDEX idx_menus_legacy ON menus(household_id, legacy_id) WHERE legacy_id IS NOT NULL;

CREATE TRIGGER menus_updated_at
  BEFORE UPDATE ON menus
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Now add the circular FK from households to menus
ALTER TABLE households
  ADD CONSTRAINT fk_households_active_menu
  FOREIGN KEY (active_menu_id) REFERENCES menus(id) ON DELETE SET NULL;

-- ============================================================
-- kid_selections (current active-menu picks, ephemeral)
-- ============================================================
CREATE TABLE kid_selections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id    UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  kid_id          UUID NOT NULL REFERENCES kid_profiles(id) ON DELETE CASCADE,
  selections      JSONB NOT NULL DEFAULT '{}',   -- { [groupId]: foodId[] }
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One selection per kid per household (upsert pattern)
CREATE UNIQUE INDEX idx_kid_selections_unique ON kid_selections(household_id, kid_id);

-- ============================================================
-- meal_records (historical meal log)
-- ============================================================
CREATE TABLE meal_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id    UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  menu_id         UUID REFERENCES menus(id) ON DELETE SET NULL,
  date            TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  legacy_id       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_meal_records_household ON meal_records(household_id);
CREATE INDEX idx_meal_records_date ON meal_records(household_id, date DESC);

-- ============================================================
-- meal_selections (snapshot of kid picks per meal — survives deletions)
-- ============================================================
CREATE TABLE meal_selections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id         UUID NOT NULL REFERENCES meal_records(id) ON DELETE CASCADE,
  kid_id          UUID REFERENCES kid_profiles(id) ON DELETE SET NULL,
  kid_name        TEXT NOT NULL,   -- snapshot: survives profile deletion
  selections      JSONB NOT NULL DEFAULT '{}',   -- { [groupId]: foodId[] }
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_meal_selections_meal ON meal_selections(meal_id);

-- ============================================================
-- meal_reviews (parent review per kid per meal)
-- ============================================================
CREATE TABLE meal_reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id         UUID NOT NULL REFERENCES meal_records(id) ON DELETE CASCADE,
  kid_id          UUID REFERENCES kid_profiles(id) ON DELETE SET NULL,
  kid_name        TEXT NOT NULL,   -- snapshot: survives profile deletion
  completions     JSONB NOT NULL DEFAULT '{}',   -- { [foodId]: 'all'|'some'|'none'|null }
  earned_star     BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_meal_reviews_meal ON meal_reviews(meal_id);
CREATE INDEX idx_meal_reviews_kid ON meal_reviews(kid_id) WHERE kid_id IS NOT NULL;

-- ============================================================
-- shared_menus (public shareable menus with token-based access)
-- ============================================================
CREATE TABLE shared_menus (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id    UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  token           TEXT NOT NULL UNIQUE,   -- 8-char base64url token
  title           TEXT NOT NULL,
  description     TEXT,
  groups          JSONB NOT NULL DEFAULT '[]',   -- SharedMenuGroup[] (inline options, not FK refs)
  is_active       BOOLEAN NOT NULL DEFAULT true,
  legacy_id       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shared_menus_household ON shared_menus(household_id);
CREATE INDEX idx_shared_menus_token ON shared_menus(token) WHERE is_active = true;

CREATE TRIGGER shared_menus_updated_at
  BEFORE UPDATE ON shared_menus
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- shared_menu_responses (public responses to shared menus)
-- ============================================================
CREATE TABLE shared_menu_responses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id         UUID NOT NULL REFERENCES shared_menus(id) ON DELETE CASCADE,
  respondent_name TEXT NOT NULL,
  selections      JSONB NOT NULL,   -- { [groupId]: optionId[] }
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shared_menu_responses_menu ON shared_menu_responses(menu_id);

-- ============================================================
-- seed_food_templates (global — copied to new households)
-- ============================================================
CREATE TABLE seed_food_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  tags        TEXT[] NOT NULL DEFAULT '{}',
  image_url   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed data (~46 kid-friendly foods)
INSERT INTO seed_food_templates (name, tags) VALUES
  -- Protein (10)
  ('Chicken Nuggets', ARRAY['Protein']),
  ('Grilled Chicken', ARRAY['Protein']),
  ('Hot Dog', ARRAY['Protein']),
  ('Turkey Slices', ARRAY['Protein']),
  ('Fish Sticks', ARRAY['Protein']),
  ('Scrambled Eggs', ARRAY['Protein', 'Breakfast']),
  ('Hard Boiled Egg', ARRAY['Protein']),
  ('Meatballs', ARRAY['Protein']),
  ('Peanut Butter', ARRAY['Protein']),
  ('Black Beans', ARRAY['Protein']),
  -- Grain (10)
  ('Mac & Cheese', ARRAY['Grain']),
  ('Rice', ARRAY['Grain']),
  ('Pasta', ARRAY['Grain']),
  ('Toast', ARRAY['Grain', 'Breakfast']),
  ('Pancakes', ARRAY['Grain', 'Breakfast']),
  ('Waffles', ARRAY['Grain', 'Breakfast']),
  ('Tortilla', ARRAY['Grain']),
  ('Crackers', ARRAY['Grain']),
  ('Oatmeal', ARRAY['Grain', 'Breakfast']),
  ('Bagel', ARRAY['Grain', 'Breakfast']),
  -- Veggie (10)
  ('Broccoli', ARRAY['Veggie']),
  ('Carrot Sticks', ARRAY['Veggie']),
  ('Cucumber Slices', ARRAY['Veggie']),
  ('Corn', ARRAY['Veggie']),
  ('Green Beans', ARRAY['Veggie']),
  ('Peas', ARRAY['Veggie']),
  ('Sweet Potato', ARRAY['Veggie']),
  ('Celery', ARRAY['Veggie']),
  ('Bell Pepper Strips', ARRAY['Veggie']),
  ('Cherry Tomatoes', ARRAY['Veggie']),
  -- Fruit (10)
  ('Apple Slices', ARRAY['Fruit']),
  ('Banana', ARRAY['Fruit']),
  ('Strawberries', ARRAY['Fruit']),
  ('Grapes', ARRAY['Fruit']),
  ('Orange Slices', ARRAY['Fruit']),
  ('Blueberries', ARRAY['Fruit']),
  ('Watermelon', ARRAY['Fruit']),
  ('Pineapple', ARRAY['Fruit']),
  ('Mango', ARRAY['Fruit']),
  ('Raisins', ARRAY['Fruit']),
  -- Dairy (4)
  ('Yogurt', ARRAY['Dairy', 'Breakfast']),
  ('Cheese Stick', ARRAY['Dairy']),
  ('Milk', ARRAY['Dairy']),
  ('Cottage Cheese', ARRAY['Dairy']),
  -- Breakfast (2, cross-tagged)
  ('Cereal', ARRAY['Grain', 'Breakfast']),
  ('Granola Bar', ARRAY['Grain', 'Breakfast']);

COMMIT;
