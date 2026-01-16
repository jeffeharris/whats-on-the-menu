export const STORAGE_KEYS = {
  APP_STATE: 'whats-on-menu-app-state',
  FOOD_LIBRARY: 'whats-on-menu-food-library',
  KID_PROFILES: 'whats-on-menu-kid-profiles',
  MENU: 'whats-on-menu-menu',
} as const;

export function getStorageItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setStorageItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
}

export function removeStorageItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to remove from localStorage:', error);
  }
}
