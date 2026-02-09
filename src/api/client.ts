import type { FoodItem, KidProfile, AvatarColor, AvatarAnimal, SavedMenu, KidSelection, MealRecord, KidMealReview, MenuGroup, GroupSelections, PresetSlot, SharedMenu, SharedMenuResponse, SharedMenuGroup, HouseholdMember, HouseholdInvitation, InviteInfo } from '../types';

const API_BASE = '/api';

async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...options,
    credentials: 'include',
  });
}

// Foods API
export const foodsApi = {
  async getAll(): Promise<{ items: FoodItem[] }> {
    const res = await apiFetch(`${API_BASE}/foods`);
    if (!res.ok) throw new Error('Failed to fetch foods');
    return res.json();
  },

  async create(name: string, tags: string[], imageUrl: string | null): Promise<FoodItem> {
    const res = await apiFetch(`${API_BASE}/foods`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, tags, imageUrl }),
    });
    if (!res.ok) throw new Error('Failed to create food');
    return res.json();
  },

  async update(id: string, updates: Partial<Omit<FoodItem, 'id'>>): Promise<FoodItem> {
    const res = await apiFetch(`${API_BASE}/foods/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update food');
    return res.json();
  },

  async delete(id: string): Promise<void> {
    const res = await apiFetch(`${API_BASE}/foods/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete food');
  },
};

// Profiles API
export const profilesApi = {
  async getAll(): Promise<{ profiles: KidProfile[] }> {
    const res = await apiFetch(`${API_BASE}/profiles`);
    if (!res.ok) throw new Error('Failed to fetch profiles');
    return res.json();
  },

  async create(name: string, avatarColor: AvatarColor, avatarAnimal?: AvatarAnimal): Promise<KidProfile> {
    const res = await apiFetch(`${API_BASE}/profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, avatarColor, avatarAnimal }),
    });
    if (!res.ok) throw new Error('Failed to create profile');
    return res.json();
  },

  async update(id: string, updates: Partial<Omit<KidProfile, 'id'>>): Promise<KidProfile> {
    const res = await apiFetch(`${API_BASE}/profiles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update profile');
    return res.json();
  },

  async delete(id: string): Promise<void> {
    const res = await apiFetch(`${API_BASE}/profiles/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete profile');
  },
};

// Menus API
export const menusApi = {
  async getAll(): Promise<{ menus: SavedMenu[] }> {
    const res = await apiFetch(`${API_BASE}/menus`);
    if (!res.ok) throw new Error('Failed to fetch menus');
    return res.json();
  },

  async create(groups: MenuGroup[], name?: string): Promise<SavedMenu> {
    const res = await apiFetch(`${API_BASE}/menus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, groups }),
    });
    if (!res.ok) throw new Error('Failed to create menu');
    return res.json();
  },

  async update(id: string, updates: Partial<Omit<SavedMenu, 'id' | 'createdAt' | 'updatedAt'>>): Promise<SavedMenu> {
    const res = await apiFetch(`${API_BASE}/menus/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update menu');
    return res.json();
  },

  async delete(id: string): Promise<void> {
    const res = await apiFetch(`${API_BASE}/menus/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete menu');
  },

  async getActive(): Promise<{ menu: SavedMenu | null; selections: KidSelection[] }> {
    const res = await apiFetch(`${API_BASE}/menus/active`);
    if (!res.ok) throw new Error('Failed to fetch active menu');
    return res.json();
  },

  async setActive(menuId: string | null): Promise<void> {
    const res = await apiFetch(`${API_BASE}/menus/active`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ menuId }),
    });
    if (!res.ok) throw new Error('Failed to set active menu');
  },

  async addSelection(kidId: string, selections: GroupSelections): Promise<KidSelection> {
    const res = await apiFetch(`${API_BASE}/menus/selections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kidId, selections }),
    });
    if (!res.ok) throw new Error('Failed to add selection');
    return res.json();
  },

  async clearSelections(): Promise<void> {
    const res = await apiFetch(`${API_BASE}/menus/selections`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to clear selections');
  },

  async getPresets(): Promise<{ presets: Record<PresetSlot, SavedMenu | null> }> {
    const res = await apiFetch(`${API_BASE}/menus/presets`);
    if (!res.ok) throw new Error('Failed to fetch presets');
    return res.json();
  },

  async updatePreset(slot: PresetSlot, name: string, groups: MenuGroup[]): Promise<SavedMenu> {
    const res = await apiFetch(`${API_BASE}/menus/presets/${slot}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, groups }),
    });
    if (!res.ok) throw new Error('Failed to update preset');
    return res.json();
  },

  async deletePreset(slot: PresetSlot): Promise<void> {
    const res = await apiFetch(`${API_BASE}/menus/presets/${slot}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete preset');
  },

  async copyPreset(fromSlot: PresetSlot, toSlot: PresetSlot): Promise<SavedMenu> {
    const res = await apiFetch(`${API_BASE}/menus/presets/${fromSlot}/copy/${toSlot}`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to copy preset');
    return res.json();
  },
};

// Uploads API
export interface StorageStats {
  used: number;
  limit: number;
  percentage: number;
  warning: boolean;
  limitMB: number;
  usedMB: number;
}

export interface UploadResponse {
  imageUrl: string;
  filename: string;
  storage: StorageStats;
}

export const uploadsApi = {
  async upload(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('image', file);

    const res = await apiFetch(`${API_BASE}/uploads`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to upload image');
    }
    return res.json();
  },

  async getStorage(): Promise<StorageStats> {
    const res = await apiFetch(`${API_BASE}/uploads/storage`);
    if (!res.ok) throw new Error('Failed to fetch storage stats');
    return res.json();
  },

  async delete(filename: string): Promise<{ success: boolean; storage: StorageStats }> {
    const res = await apiFetch(`${API_BASE}/uploads/${filename}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete image');
    return res.json();
  },
};

// Meals API
export const mealsApi = {
  async getAll(): Promise<{ meals: MealRecord[] }> {
    const res = await apiFetch(`${API_BASE}/meals`);
    if (!res.ok) throw new Error('Failed to fetch meals');
    return res.json();
  },

  async get(id: string): Promise<MealRecord> {
    const res = await apiFetch(`${API_BASE}/meals/${id}`);
    if (!res.ok) throw new Error('Failed to fetch meal');
    return res.json();
  },

  async create(menuId: string, selections: KidSelection[], reviews: KidMealReview[]): Promise<MealRecord> {
    const res = await apiFetch(`${API_BASE}/meals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ menuId, selections, reviews }),
    });
    if (!res.ok) throw new Error('Failed to create meal');
    return res.json();
  },

  async delete(id: string): Promise<void> {
    const res = await apiFetch(`${API_BASE}/meals/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete meal');
  },
};

// Shared Menus API
export const sharedMenusApi = {
  async create(title: string, description: string | undefined, groups: SharedMenuGroup[]): Promise<SharedMenu> {
    const res = await apiFetch(`${API_BASE}/shared-menus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, groups }),
    });
    if (!res.ok) throw new Error('Failed to create shared menu');
    return res.json();
  },

  async getAll(): Promise<{ menus: SharedMenu[] }> {
    const res = await apiFetch(`${API_BASE}/shared-menus`);
    if (!res.ok) throw new Error('Failed to fetch shared menus');
    return res.json();
  },

  async get(id: string): Promise<{ menu: SharedMenu }> {
    const res = await apiFetch(`${API_BASE}/shared-menus/${id}`);
    if (!res.ok) throw new Error('Failed to fetch shared menu');
    return res.json();
  },

  async getByToken(token: string): Promise<{ menu: SharedMenu }> {
    const res = await apiFetch(`${API_BASE}/shared-menus/view/${token}`);
    if (!res.ok) throw new Error('Failed to fetch shared menu');
    return res.json();
  },

  async submitResponse(token: string, respondentName: string, selections: { [groupId: string]: string[] }): Promise<SharedMenuResponse> {
    const res = await apiFetch(`${API_BASE}/shared-menus/respond/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ respondentName, selections }),
    });
    if (!res.ok) throw new Error('Failed to submit response');
    return res.json();
  },

  async getResponses(menuId: string): Promise<{ responses: SharedMenuResponse[] }> {
    const res = await apiFetch(`${API_BASE}/shared-menus/${menuId}/responses`);
    if (!res.ok) throw new Error('Failed to fetch responses');
    return res.json();
  },

  async update(id: string, updates: Partial<SharedMenu>): Promise<SharedMenu> {
    const res = await apiFetch(`${API_BASE}/shared-menus/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update shared menu');
    return res.json();
  },

  async delete(id: string): Promise<void> {
    const res = await apiFetch(`${API_BASE}/shared-menus/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete shared menu');
  },
};

// Household API
export const householdApi = {
  async getMembers(): Promise<{ members: HouseholdMember[] }> {
    const res = await apiFetch(`${API_BASE}/household/members`);
    if (!res.ok) throw new Error('Failed to fetch members');
    return res.json();
  },

  async invite(email: string): Promise<{ success: boolean; invitation: HouseholdInvitation }> {
    const res = await apiFetch(`${API_BASE}/household/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to send invitation');
    }
    return res.json();
  },

  async getInvitations(): Promise<{ invitations: HouseholdInvitation[] }> {
    const res = await apiFetch(`${API_BASE}/household/invitations`);
    if (!res.ok) throw new Error('Failed to fetch invitations');
    return res.json();
  },

  async revokeInvitation(id: string): Promise<{ success: boolean }> {
    const res = await apiFetch(`${API_BASE}/household/invitations/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to revoke invitation');
    return res.json();
  },

  async removeMember(userId: string): Promise<{ success: boolean }> {
    const res = await apiFetch(`${API_BASE}/household/members/${userId}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to remove member');
    }
    return res.json();
  },

  async leaveHousehold(): Promise<{ success: boolean }> {
    const res = await apiFetch(`${API_BASE}/household/leave`, { method: 'POST' });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to leave household');
    }
    return res.json();
  },

  async acceptInvitation(token: string): Promise<{ success: boolean; householdId: string }> {
    const res = await apiFetch(`${API_BASE}/household/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to accept invitation');
    }
    return res.json();
  },

  async getInviteInfo(token: string): Promise<InviteInfo> {
    const res = await apiFetch(`${API_BASE}/household/invite-info?token=${encodeURIComponent(token)}`);
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to fetch invitation info');
    }
    return res.json();
  },
};

// Auth API
export const authApi = {
  async login(email: string): Promise<{ success: boolean }> {
    const res = await apiFetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Login failed');
    }
    return res.json();
  },

  async signup(email: string, householdName?: string, inviteToken?: string): Promise<{ success: boolean }> {
    const res = await apiFetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, householdName, inviteToken }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Signup failed');
    }
    return res.json();
  },

  async logout(): Promise<void> {
    await apiFetch(`${API_BASE}/auth/logout`, { method: 'POST' });
  },

  async me(): Promise<{ user: { id: string; email: string; displayName: string | null; role: string }; household: { id: string; name: string } } | null> {
    const res = await apiFetch(`${API_BASE}/auth/me`);
    if (!res.ok) return null;
    return res.json();
  },

  async verifyPin(pin: string): Promise<{ valid: boolean }> {
    const res = await apiFetch(`${API_BASE}/auth/verify-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    if (!res.ok) throw new Error('PIN verification failed');
    return res.json();
  },

  async updatePin(currentPin: string, newPin: string): Promise<{ success: boolean }> {
    const res = await apiFetch(`${API_BASE}/auth/update-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPin, newPin }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'PIN update failed');
    }
    return res.json();
  },
};
