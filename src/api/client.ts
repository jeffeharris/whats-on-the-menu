import type { FoodItem, KidProfile, AvatarColor, AvatarAnimal, SavedMenu, KidSelection, MealRecord, KidMealReview, MenuGroup, GroupSelections, PresetSlot, SharedMenu, SharedMenuResponse, SharedMenuGroup, HouseholdMember, HouseholdInvitation, InviteInfo, SelectionStatus } from '../types';

const API_BASE = '/api';

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
  });
}

async function getApiError(res: Response, fallback: string): Promise<Error> {
  const body = await res.json().catch(() => null) as { error?: string } | null;
  return new Error(body?.error || fallback);
}

async function request(path: string, fallback: string, options: RequestInit = {}): Promise<Response> {
  const res = await apiFetch(path, options);
  if (!res.ok) throw await getApiError(res, fallback);
  return res;
}

function jsonBody(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

async function get<T>(path: string, fallback: string): Promise<T> {
  const res = await request(path, fallback);
  return res.json();
}

async function post<T>(path: string, fallback: string, body?: unknown): Promise<T> {
  const res = await request(path, fallback, body === undefined ? { method: 'POST' } : jsonBody('POST', body));
  return res.json();
}

async function put<T>(path: string, fallback: string, body: unknown): Promise<T> {
  const res = await request(path, fallback, jsonBody('PUT', body));
  return res.json();
}

async function del<T>(path: string, fallback: string): Promise<T> {
  const res = await request(path, fallback, { method: 'DELETE' });
  return res.json();
}

// Foods API
export const foodsApi = {
  async getAll(): Promise<{ items: FoodItem[] }> {
    return get('/foods', 'Failed to fetch foods');
  },

  async create(name: string, tags: string[], imageUrl: string | null): Promise<FoodItem> {
    return post('/foods', 'Failed to create food', { name, tags, imageUrl });
  },

  async update(id: string, updates: Partial<Omit<FoodItem, 'id'>>): Promise<FoodItem> {
    return put(`/foods/${id}`, 'Failed to update food', updates);
  },

  async delete(id: string): Promise<void> {
    await request(`/foods/${id}`, 'Failed to delete food', { method: 'DELETE' });
  },
};

// Profiles API
export const profilesApi = {
  async getAll(): Promise<{ profiles: KidProfile[] }> {
    return get('/profiles', 'Failed to fetch profiles');
  },

  async create(name: string, avatarColor: AvatarColor, avatarAnimal?: AvatarAnimal): Promise<KidProfile> {
    return post('/profiles', 'Failed to create profile', { name, avatarColor, avatarAnimal });
  },

  async update(id: string, updates: Partial<Omit<KidProfile, 'id'>>): Promise<KidProfile> {
    return put(`/profiles/${id}`, 'Failed to update profile', updates);
  },

  async delete(id: string): Promise<void> {
    await request(`/profiles/${id}`, 'Failed to delete profile', { method: 'DELETE' });
  },
};

// Menus API
export const menusApi = {
  async getAll(): Promise<{ menus: SavedMenu[] }> {
    return get('/menus', 'Failed to fetch menus');
  },

  async create(groups: MenuGroup[], name?: string): Promise<SavedMenu> {
    return post('/menus', 'Failed to create menu', { name, groups });
  },

  async update(id: string, updates: Partial<Omit<SavedMenu, 'id' | 'createdAt' | 'updatedAt'>>): Promise<SavedMenu> {
    return put(`/menus/${id}`, 'Failed to update menu', updates);
  },

  async delete(id: string): Promise<void> {
    await request(`/menus/${id}`, 'Failed to delete menu', { method: 'DELETE' });
  },

  async getActive(): Promise<{
    menu: SavedMenu | null;
    selections: KidSelection[];
    selectionStatus: SelectionStatus;
    selectionRevision: number;
  }> {
    return get('/menus/active', 'Failed to fetch active menu');
  },

  async setActive(menuId: string | null): Promise<void> {
    await request('/menus/active', 'Failed to set active menu', jsonBody('PUT', { menuId }));
  },

  async addSelection(
    kidId: string,
    selections: GroupSelections,
    menuId: string,
    selectionRevision: number
  ): Promise<KidSelection> {
    return post('/menus/selections', 'Failed to save choices', { kidId, selections, menuId, selectionRevision });
  },

  async setSelectionStatus(status: SelectionStatus): Promise<SelectionStatus> {
    const data = await put<{ selectionStatus: SelectionStatus }>('/menus/selections/status', 'Failed to update choice approval', { status });
    return data.selectionStatus;
  },

  async clearSelections(): Promise<void> {
    await request('/menus/selections', 'Failed to clear selections', { method: 'DELETE' });
  },

  async getPresets(): Promise<{ presets: Record<PresetSlot, SavedMenu | null> }> {
    return get('/menus/presets', 'Failed to fetch presets');
  },

  async updatePreset(
    slot: PresetSlot,
    name: string,
    groups: MenuGroup[],
    expectedUpdatedAt: number | null
  ): Promise<SavedMenu & { affectsActiveMenu: boolean }> {
    return put(`/menus/presets/${slot}`, 'Failed to update preset', { name, groups, expectedUpdatedAt });
  },

  async deletePreset(slot: PresetSlot): Promise<void> {
    await request(`/menus/presets/${slot}`, 'Failed to delete preset', { method: 'DELETE' });
  },

  async copyPreset(
    fromSlot: PresetSlot,
    toSlot: PresetSlot
  ): Promise<SavedMenu & { affectsActiveMenu: boolean }> {
    return post(`/menus/presets/${fromSlot}/copy/${toSlot}`, 'Failed to copy preset');
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

    // FormData body: the browser sets the multipart Content-Type boundary itself.
    const res = await request('/uploads', 'Failed to upload image', {
      method: 'POST',
      body: formData,
    });
    return res.json();
  },

  async getStorage(): Promise<StorageStats> {
    return get('/uploads/storage', 'Failed to fetch storage stats');
  },

  async delete(filename: string): Promise<{ success: boolean; storage: StorageStats }> {
    return del(`/uploads/${filename}`, 'Failed to delete image');
  },
};

// Meals API
export const mealsApi = {
  async getAll(): Promise<{ meals: MealRecord[] }> {
    return get('/meals', 'Failed to fetch meals');
  },

  async get(id: string): Promise<MealRecord> {
    return get(`/meals/${id}`, 'Failed to fetch meal');
  },

  async create(menuId: string, selections: KidSelection[], reviews: KidMealReview[]): Promise<MealRecord> {
    return post('/meals', 'Failed to create meal', { menuId, selections, reviews });
  },

  async delete(id: string): Promise<void> {
    await request(`/meals/${id}`, 'Failed to delete meal', { method: 'DELETE' });
  },
};

// Shared Menus API
export const sharedMenusApi = {
  async create(title: string, description: string | undefined, groups: SharedMenuGroup[]): Promise<SharedMenu> {
    return post('/shared-menus', 'Failed to create shared menu', { title, description, groups });
  },

  async getAll(): Promise<{ menus: SharedMenu[] }> {
    return get('/shared-menus', 'Failed to fetch shared menus');
  },

  async get(id: string): Promise<{ menu: SharedMenu }> {
    return get(`/shared-menus/${id}`, 'Failed to fetch shared menu');
  },

  async getByToken(token: string): Promise<{ menu: SharedMenu }> {
    return get(`/shared-menus/view/${token}`, 'Failed to fetch shared menu');
  },

  async submitResponse(token: string, respondentName: string, selections: { [groupId: string]: string[] }): Promise<SharedMenuResponse> {
    return post(`/shared-menus/respond/${token}`, 'Failed to submit response', { respondentName, selections });
  },

  async getResponses(menuId: string): Promise<{ responses: SharedMenuResponse[] }> {
    return get(`/shared-menus/${menuId}/responses`, 'Failed to fetch responses');
  },

  async update(id: string, updates: Partial<SharedMenu>): Promise<SharedMenu> {
    return put(`/shared-menus/${id}`, 'Failed to update shared menu', updates);
  },

  async delete(id: string): Promise<void> {
    await request(`/shared-menus/${id}`, 'Failed to delete shared menu', { method: 'DELETE' });
  },
};

// Household API
export const householdApi = {
  async getMembers(): Promise<{ members: HouseholdMember[] }> {
    return get('/household/members', 'Failed to fetch members');
  },

  async invite(email: string): Promise<{ success: boolean; invitation: HouseholdInvitation }> {
    return post('/household/invite', 'Failed to send invitation', { email });
  },

  async getInvitations(): Promise<{ invitations: HouseholdInvitation[] }> {
    return get('/household/invitations', 'Failed to fetch invitations');
  },

  async revokeInvitation(id: string): Promise<{ success: boolean }> {
    return del(`/household/invitations/${id}`, 'Failed to revoke invitation');
  },

  async removeMember(userId: string): Promise<{ success: boolean }> {
    return del(`/household/members/${userId}`, 'Failed to remove member');
  },

  async leaveHousehold(): Promise<{ success: boolean }> {
    return post('/household/leave', 'Failed to leave household');
  },

  async getInviteInfo(token: string): Promise<InviteInfo> {
    return get(`/household/invite-info?token=${encodeURIComponent(token)}`, 'Failed to fetch invitation info');
  },
};

// Auth API
export const authApi = {
  async login(email: string): Promise<{ success: boolean }> {
    return post('/auth/login', 'Login failed', { email });
  },

  async signup(email: string, householdName?: string): Promise<{ success: boolean }> {
    return post('/auth/signup', 'Signup failed', { email, householdName });
  },

  async logout(): Promise<void> {
    await apiFetch('/auth/logout', { method: 'POST' });
  },

  async me(): Promise<{ user: { id: string; email: string; displayName: string | null; role: string }; household: { id: string; name: string } } | null> {
    const res = await apiFetch('/auth/me');
    if (!res.ok) return null;
    return res.json();
  },

  async setGrownUpCheck(enabled: boolean): Promise<{ success: boolean; grownUpCheckEnabled: boolean }> {
    return put('/auth/grownup-check', 'Failed to update the grown-up check', { enabled });
  },
};
