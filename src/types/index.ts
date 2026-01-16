export type FoodCategory = 'main' | 'side';

export type AvatarColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink';

export interface FoodItem {
  id: string;
  name: string;
  imageUrl: string | null;
  category: FoodCategory;
}

export interface KidProfile {
  id: string;
  name: string;
  avatarColor: AvatarColor;
}

export interface Menu {
  id: string;
  mains: string[];  // FoodItem IDs (2-3 items)
  sides: string[];  // FoodItem IDs (2-4 items)
}

export interface SavedMenu {
  id: string;
  name: string;
  mains: string[];
  sides: string[];
  createdAt: number;
  updatedAt: number;
}

export interface KidSelection {
  kidId: string;
  mainId: string | null;
  sideIds: string[];
  timestamp: number;
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
  mainCompletion: CompletionStatus;
  sideCompletions: { [sideId: string]: CompletionStatus };
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
