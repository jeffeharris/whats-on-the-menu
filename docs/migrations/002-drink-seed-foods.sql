-- Migration 002: Add drink items and snack tags to seed foods
-- Run against existing databases to add new seed data

BEGIN;

-- New drink items
INSERT INTO seed_food_templates (name, tags, image_url) VALUES
  ('Water', ARRAY['Drink'], NULL),
  ('Apple Juice', ARRAY['Drink'], NULL);

-- Update Milk to include Drink tag
UPDATE seed_food_templates
  SET tags = ARRAY['Dairy', 'Drink']
  WHERE name = 'Milk';

-- Add Snack tag to appropriate foods
UPDATE seed_food_templates
  SET tags = array_append(tags, 'Snack')
  WHERE name IN ('Crackers', 'Granola Bar', 'Cheese Stick', 'Raisins')
    AND NOT ('Snack' = ANY(tags));

COMMIT;
