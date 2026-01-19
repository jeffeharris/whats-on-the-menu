// Selection presets for menu groups
export type SelectionPreset = 'pick-1' | 'pick-1-2' | 'pick-2' | 'pick-2-3';

export const SELECTION_PRESET_CONFIG: Record<SelectionPreset, { min: number; max: number; label: string }> = {
  'pick-1': { min: 1, max: 1, label: 'Choose 1' },
  'pick-1-2': { min: 1, max: 2, label: 'Choose 1 or 2' },
  'pick-2': { min: 2, max: 2, label: 'Choose 2' },
  'pick-2-3': { min: 2, max: 3, label: 'Choose 2 or 3' },
};

// Preset slots for quick-access menus
export type PresetSlot = 'breakfast' | 'snack' | 'dinner' | 'custom';

export const PRESET_CONFIG: Record<PresetSlot, { label: string; icon: string; order: number }> = {
  breakfast: { label: 'Breakfast', icon: 'Sunrise', order: 0 },
  snack: { label: 'Snack', icon: 'Cookie', order: 1 },
  dinner: { label: 'Dinner', icon: 'Moon', order: 2 },
  custom: { label: 'Custom', icon: 'Sun', order: 3 },
};

// Predefined tags for food items
export const PREDEFINED_TAGS = ['Protein', 'Veggie', 'Grain', 'Fruit', 'Dairy', 'Breakfast'] as const;

export type AvatarColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink';

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

export type AppMode = 'kid' | 'parent';

export interface AppState {
  mode: AppMode;
  isParentAuthenticated: boolean;
  parentPin: string;
  selectedKidId: string | null;
}

export interface FoodLibraryState {
  items: FoodItem[];
}

export interface KidProfilesState {
  profiles: KidProfile[];
}

export interface MenuState {
  currentMenu: Menu | null;
  selections: KidSelection[];
  selectionsLocked: boolean;
}

export type CompletionStatus = 'all' | 'some' | 'none' | null;

export interface KidMealReview {
  kidId: string;
  completions: { [foodId: string]: CompletionStatus };
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

export interface MealHistoryState {
  meals: MealRecord[];
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
