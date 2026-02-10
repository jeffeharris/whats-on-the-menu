import { z } from 'zod';

// ============================================================
// Auth schemas
// ============================================================

export const signupSchema = z.object({
  email: z.string().email('A valid email is required'),
  householdName: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('A valid email is required'),
});

export const verifyPinSchema = z.object({
  pin: z.string(),
});

export const updatePinSchema = z.object({
  currentPin: z.string(),
  newPin: z.string().regex(/^\d{4}$/, 'New PIN must be exactly 4 digits'),
});

export const enablePinSchema = z.object({
  pin: z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits'),
});

// ============================================================
// Household / invitation schemas
// ============================================================

export const invitePartnerSchema = z.object({
  email: z.string().email('A valid email is required'),
});

// ============================================================
// Food schemas
// ============================================================

export const createFoodSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  tags: z.array(z.string()).optional(),
  imageUrl: z.string().nullable().optional(),
});

export const updateFoodSchema = z.looseObject({
  name: z.string().min(1).optional(),
  tags: z.array(z.string()).optional(),
  imageUrl: z.string().nullable().optional(),
});

// ============================================================
// Profile schemas
// ============================================================

export const createProfileSchema = z.object({
  name: z.string().min(1, 'Name and avatarColor are required'),
  avatarColor: z.string().min(1, 'Name and avatarColor are required'),
  avatarAnimal: z.string().optional(),
});

export const updateProfileSchema = z.looseObject({
  name: z.string().min(1).optional(),
  avatarColor: z.string().optional(),
  avatarAnimal: z.string().optional(),
});

// ============================================================
// Reusable sub-schemas for JSONB validation
// ============================================================

const selectionPresetSchema = z.enum(['pick-1', 'pick-1-2', 'pick-2', 'pick-2-3']);

const menuGroupSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  foodIds: z.array(z.string()),
  selectionPreset: selectionPresetSchema,
  order: z.number().int().nonnegative(),
  filterTags: z.array(z.string()).optional(),
  excludeTags: z.array(z.string()).optional(),
});

const groupSelectionsSchema = z.record(z.string(), z.array(z.string()));

const kidSelectionSchema = z.object({
  kidId: z.string().min(1),
  selections: groupSelectionsSchema,
  timestamp: z.number().optional(),
});

const kidMealReviewSchema = z.object({
  kidId: z.string().min(1),
  completions: z.record(z.string(), z.enum(['all', 'some', 'none']).nullable()),
  earnedStar: z.boolean().optional(),
});

const sharedMenuOptionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  imageUrl: z.string().nullable(),
  order: z.number().int().nonnegative(),
});

const sharedMenuGroupSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  options: z.array(sharedMenuOptionSchema),
  selectionPreset: z.string().min(1),
  order: z.number().int().nonnegative(),
});

// ============================================================
// Menu schemas
// ============================================================

export const createMenuSchema = z.object({
  name: z.string().optional(),
  groups: z.array(menuGroupSchema).min(1, 'At least one group is required'),
});

export const updateMenuSchema = z.object({
  name: z.string().optional(),
  groups: z.array(menuGroupSchema).optional(),
});

export const setActiveMenuSchema = z.object({
  menuId: z.string().nullable(),
});

export const addSelectionSchema = z.object({
  kidId: z.string().min(1, 'kidId is required'),
  selections: groupSelectionsSchema.optional(),
});

export const updatePresetSchema = z.object({
  name: z.string().optional(),
  groups: z.array(menuGroupSchema),
});

// ============================================================
// Meal schemas
// ============================================================

export const createMealSchema = z.object({
  menuId: z.string().min(1, 'menuId, selections, and reviews are required'),
  selections: z.array(kidSelectionSchema),
  reviews: z.array(kidMealReviewSchema),
});

// ============================================================
// Shared menu schemas
// ============================================================

export const createSharedMenuSchema = z.object({
  title: z.string().min(1, 'title and groups are required'),
  description: z.string().optional(),
  groups: z.array(sharedMenuGroupSchema),
});

export const updateSharedMenuSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  groups: z.array(sharedMenuGroupSchema).optional(),
  isActive: z.boolean().optional(),
});

export const submitResponseSchema = z.object({
  respondentName: z.string().min(1, 'respondentName is required'),
  selections: z.record(z.string(), z.array(z.string())),
});
