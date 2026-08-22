// Selection presets for menu groups
export type SelectionPreset = 'pick-1' | 'pick-1-2' | 'pick-2' | 'pick-2-3' | 'any';

export const SELECTION_PRESET_CONFIG: Record<SelectionPreset, { min: number; max: number; label: string }> = {
  'pick-1': { min: 1, max: 1, label: 'Choose 1' },
  'pick-1-2': { min: 1, max: 2, label: 'Choose 1 or 2' },
  'pick-2': { min: 2, max: 2, label: 'Choose 2' },
  'pick-2-3': { min: 2, max: 3, label: 'Choose 2 or 3' },
  any: { min: 0, max: 12, label: 'Any number' },
};

/**
 * Presets a grown-up can pick when building a menu. 'any' is excluded: it
 * exists for the synthesized add-ons group only, and offering it in a builder
 * would let a real menu group opt out of the pick-N rules the kid flow is
 * built around.
 */
export const AUTHORABLE_SELECTION_PRESETS: SelectionPreset[] = [
  'pick-1', 'pick-1-2', 'pick-2', 'pick-2-3',
];

/**
 * The group a grown-up's additions land in. The server synthesizes it onto the
 * active menu rather than storing it -- see server/db/queries/menus.ts. It is
 * never a real part of a saved menu, so anything that edits or presents a menu
 * for authoring has to filter it out.
 */
export const ADD_ONS_GROUP_ID = 'add-ons';

export function isAddOnsGroup(group: { id: string }): boolean {
  return group.id === ADD_ONS_GROUP_ID;
}

export function withoutAddOnsGroup<T extends { id: string }>(groups: T[]): T[] {
  return groups.filter((group) => !isAddOnsGroup(group));
}

// Preset slots for quick-access menus
export type PresetSlot = 'breakfast' | 'snack' | 'dinner' | 'custom';

export const PRESET_CONFIG: Record<PresetSlot, { label: string; icon: string; order: number }> = {
  breakfast: { label: 'Breakfast', icon: 'Sunrise', order: 0 },
  snack: { label: 'Snack', icon: 'Cookie', order: 1 },
  dinner: { label: 'Dinner', icon: 'Moon', order: 2 },
  custom: { label: 'Custom', icon: 'Sun', order: 3 },
};

// Predefined tags for food items
export const PREDEFINED_TAGS = ['Protein', 'Veggie', 'Grain', 'Fruit', 'Dairy', 'Breakfast', 'Snack', 'Drink'] as const;

export type AvatarColor = 'red' | 'orange' | 'yellow' | 'green' | 'teal' | 'blue' | 'purple' | 'pink';

export { type AvatarAnimal, AVATAR_ANIMALS, getAvatarImagePath } from './avatars';

// Legacy type for backwards compatibility during migration
export type FoodCategory = 'main' | 'side';

export interface FoodItem {
  id: string;
  name: string;
  imageUrl: string | null;
  tags: string[];
  // Legacy field for migration - will be removed after migration
  category?: FoodCategory;
}

export interface KidProfile {
  id: string;
  name: string;
  avatarColor: AvatarColor;
  avatarAnimal?: import('./avatars').AvatarAnimal;
}

export interface MenuGroup {
  id: string;
  label: string;
  foodIds: string[];
  selectionPreset: SelectionPreset;
  order: number;
  filterTags?: string[];   // Include: only show foods WITH these tags
  excludeTags?: string[];  // Exclude: hide foods WITH these tags
}

export interface Menu {
  id: string;
  groups: MenuGroup[];
  // Legacy fields for migration - will be removed after migration
  mains?: string[];
  sides?: string[];
}

export interface SavedMenu {
  id: string;
  name: string;
  groups: MenuGroup[];
  createdAt: number;
  updatedAt: number;
  presetSlot?: PresetSlot;
  // Legacy fields for migration - will be removed after migration
  mains?: string[];
  sides?: string[];
}

// New selection structure: groupId -> selected foodIds
export interface GroupSelections {
  [groupId: string]: string[];
}

export interface KidSelection {
  kidId: string;
  selections: GroupSelections;
  timestamp: number;
  // Legacy fields for migration - will be removed after migration
  mainId?: string | null;
  sideIds?: string[];
}

export type SelectionStatus = 'open' | 'approved';

export type AppMode = 'kid' | 'parent';

/**
 * The half of the app state that is safe to persist to localStorage.
 *
 * isParentAuthenticated is deliberately NOT here. Persisting it meant the
 * grown-up check never challenged again once passed on a device — including
 * for a different household signing in on the same browser — which defeated
 * the point of having a check at all.
 */
export interface AppState {
  mode: AppMode;
  selectedKidId: string | null;
}

export type CompletionStatus = 'all' | 'some' | 'tried' | 'none' | null;

export interface KidMealReview {
  kidId: string;
  completions: { [foodId: string]: CompletionStatus };
  earnedStar?: boolean;
  // Legacy fields for migration
  mainCompletion?: CompletionStatus;
  sideCompletions?: { [sideId: string]: CompletionStatus };
}

export interface MealRecord {
  id: string;
  menuId: string;
  date: number;
  selections: KidSelection[];
  reviews: KidMealReview[];
  completedAt: number;
}

// Shared Menu Domain - separate from kid menu domain
export interface SharedMenuOption {
  id: string;
  text: string;
  imageUrl: string | null;
  order: number;
}

export interface SharedMenuGroup {
  id: string;
  label: string;
  options: SharedMenuOption[];
  selectionPreset: SelectionPreset;
  order: number;
}

export interface SharedMenu {
  id: string;
  token: string;
  title: string;
  description?: string;
  groups: SharedMenuGroup[];
  createdAt: number;
  isActive: boolean;
}

export interface SharedMenuResponse {
  id: string;
  menuId: string;
  respondentName: string;
  selections: {
    [groupId: string]: string[];
  };
  timestamp: number;
}

// Household member/invitation types
export interface HouseholdMember {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
}

export interface HouseholdInvitation {
  id: string;
  householdId: string;
  invitedBy: string;
  inviterEmail: string;
  email: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

export interface InviteInfo {
  householdName: string;
  inviterEmail: string;
  status: string;
  expired: boolean;
}
