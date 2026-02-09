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
// Menu schemas
// ============================================================

export const createMenuSchema = z.object({
  name: z.string().optional(),
  groups: z.array(z.record(z.string(), z.unknown())).min(1, 'At least one group is required'),
});

export const updateMenuSchema = z.object({
  name: z.string().optional(),
  groups: z.array(z.record(z.string(), z.unknown())).optional(),
});

export const setActiveMenuSchema = z.object({
  menuId: z.string().nullable(),
});

export const addSelectionSchema = z.object({
  kidId: z.string().min(1, 'kidId is required'),
  selections: z.record(z.string(), z.unknown()).optional(),
});

export const updatePresetSchema = z.object({
  name: z.string().optional(),
  groups: z.array(z.record(z.string(), z.unknown())),
});

// ============================================================
// Meal schemas
// ============================================================

export const createMealSchema = z.object({
  menuId: z.string().min(1, 'menuId, selections, and reviews are required'),
  selections: z.record(z.string(), z.unknown()),
  reviews: z.record(z.string(), z.unknown()),
});

// ============================================================
// Shared menu schemas
// ============================================================

export const createSharedMenuSchema = z.object({
  title: z.string().min(1, 'title and groups are required'),
  description: z.string().optional(),
  groups: z.array(z.record(z.string(), z.unknown())),
});

export const updateSharedMenuSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  groups: z.array(z.record(z.string(), z.unknown())).optional(),
  isActive: z.boolean().optional(),
});

export const submitResponseSchema = z.object({
  respondentName: z.string().min(1, 'respondentName is required'),
  selections: z.record(z.string(), z.array(z.string())),
});
