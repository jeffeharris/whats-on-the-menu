import pool from '../pool.js';
import { logger } from '../../logger.js';
import { isDeepStrictEqual } from 'node:util';

// ============================================================
// Types
// ============================================================

type SelectionPreset = 'pick-1' | 'pick-1-2' | 'pick-2' | 'pick-2-3';
type PresetSlot = 'breakfast' | 'snack' | 'dinner' | 'custom';
export type SelectionStatus = 'open' | 'approved';

export class MenuOperationError extends Error {
  constructor(message: string, readonly statusCode: number) {
    super(message);
    this.name = 'MenuOperationError';
  }
}

interface MenuGroup {
  id: string;
  label: string;
  foodIds: string[];
  selectionPreset: SelectionPreset;
  order: number;
  filterTags?: string[];
  excludeTags?: string[];
}

interface SavedMenu {
  id: string;
  name: string;
  groups: MenuGroup[];
  createdAt: number;
  updatedAt: number;
  presetSlot?: PresetSlot;
}

export interface MenuMutationResult {
  menu: SavedMenu;
  affectsActiveMenu: boolean;
}

interface GroupSelections {
  [groupId: string]: string[];
}

interface KidSelection {
  kidId: string;
  selections: GroupSelections;
  timestamp: number;
}

interface MenuRow {
  id: string;
  name: string;
  groups: MenuGroup[];
  preset_slot: string | null;
  created_at: string;
  updated_at: string;
}

interface KidSelectionRow {
  kid_id: string;
  selections: GroupSelections;
  updated_at: string;
}

interface HouseholdActiveRow {
  active_menu_id: string | null;
  selection_status: SelectionStatus;
  selection_revision: string | number;
}

const SELECTION_LIMITS: Record<SelectionPreset, { min: number; max: number }> = {
  'pick-1': { min: 1, max: 1 },
  'pick-1-2': { min: 1, max: 2 },
  'pick-2': { min: 2, max: 2 },
  'pick-2-3': { min: 2, max: 3 },
};

function validateSelections(
  groups: MenuGroup[],
  selections: GroupSelections,
  statusCode = 400
): void {
  const groupsById = new Map(groups.map((group) => [group.id, group]));
  const selectedFoodIds = new Set<string>();

  for (const groupId of Object.keys(selections)) {
    if (!groupsById.has(groupId)) {
      throw new MenuOperationError('Choices include a group that is not on the active menu', statusCode);
    }
  }

  for (const group of groups) {
    const selected = selections[group.id] ?? [];
    const limits = SELECTION_LIMITS[group.selectionPreset];
    if (selected.length < limits.min || selected.length > limits.max) {
      throw new MenuOperationError(
        `Choices for ${group.label} must include between ${limits.min} and ${limits.max} item(s)`,
        statusCode
      );
    }

    if (new Set(selected).size !== selected.length) {
      throw new MenuOperationError(`Choices for ${group.label} contain a duplicate item`, statusCode);
    }

    const allowedFoodIds = new Set(group.foodIds);
    for (const foodId of selected) {
      if (!allowedFoodIds.has(foodId)) {
        throw new MenuOperationError(`A choice for ${group.label} is not on the active menu`, statusCode);
      }
      if (selectedFoodIds.has(foodId)) {
        throw new MenuOperationError('The same food cannot be selected in more than one group', statusCode);
      }
      selectedFoodIds.add(foodId);
    }
  }
}

// ============================================================
// Row → API mapping
// ============================================================

function rowToSavedMenu(row: MenuRow): SavedMenu {
  const menu: SavedMenu = {
    id: row.id,
    name: row.name,
    groups: row.groups,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
  if (row.preset_slot) {
    menu.presetSlot = row.preset_slot as PresetSlot;
  }
  return menu;
}

function rowToKidSelection(row: KidSelectionRow): KidSelection {
  return {
    kidId: row.kid_id,
    selections: row.selections,
    timestamp: new Date(row.updated_at).getTime(),
  };
}

const MENU_COLUMNS = 'id, name, groups, preset_slot, created_at, updated_at';

// ============================================================
// Menu CRUD
// ============================================================

export async function getAllMenus(householdId: string): Promise<{ menus: SavedMenu[] }> {
  const { rows } = await pool.query<MenuRow>(
    `SELECT ${MENU_COLUMNS} FROM menus WHERE household_id = $1 ORDER BY created_at`,
    [householdId]
  );
  return { menus: rows.map(rowToSavedMenu) };
}

export async function createMenu(
  householdId: string,
  name: string,
  groups: MenuGroup[]
): Promise<SavedMenu> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insert the menu
    const { rows } = await client.query<MenuRow>(
      `INSERT INTO menus (household_id, name, groups)
       VALUES ($1, $2, $3)
       RETURNING ${MENU_COLUMNS}`,
      [householdId, name, JSON.stringify(groups)]
    );
    const menu = rowToSavedMenu(rows[0]);

    // Set as active menu
    await client.query(
      `UPDATE households
       SET active_menu_id = $2,
           selection_status = 'open',
           selection_revision = selection_revision + 1
       WHERE id = $1`,
      [householdId, menu.id]
    );

    // Clear selections
    await client.query(
      'DELETE FROM kid_selections WHERE household_id = $1',
      [householdId]
    );

    await client.query('COMMIT');
    return menu;
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err, householdId }, 'Transaction failed in createMenu');
    throw err;
  } finally {
    client.release();
  }
}

export async function updateMenu(
  householdId: string,
  id: string,
  updates: Partial<{ name: string; groups: MenuGroup[] }>
): Promise<MenuMutationResult | null> {
  const client = await pool.connect();
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (updates.name !== undefined) {
    setClauses.push(`name = $${paramIndex++}`);
    values.push(updates.name);
  }
  if (updates.groups !== undefined) {
    setClauses.push(`groups = $${paramIndex++}`);
    values.push(JSON.stringify(updates.groups));
  }

  try {
    await client.query('BEGIN');
    const { rows: householdRows } = await client.query<{ active_menu_id: string | null }>(
      'SELECT active_menu_id FROM households WHERE id = $1 FOR UPDATE',
      [householdId]
    );
    const { rows: existingRows } = await client.query<MenuRow>(
      `SELECT ${MENU_COLUMNS}
       FROM menus
       WHERE id = $1 AND household_id = $2
       FOR UPDATE`,
      [id, householdId]
    );
    if (existingRows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const groupsChanged = updates.groups !== undefined
      && !isDeepStrictEqual(existingRows[0].groups, updates.groups);
    let row = existingRows[0];

    if (setClauses.length > 0) {
      const idParam = paramIndex++;
      const householdParam = paramIndex++;
      values.push(id, householdId);
      const { rows } = await client.query<MenuRow>(
        `UPDATE menus
         SET ${setClauses.join(', ')}
         WHERE id = $${idParam} AND household_id = $${householdParam}
         RETURNING ${MENU_COLUMNS}`,
        values
      );
      row = rows[0];
    }

    const affectsActiveMenu = householdRows[0]?.active_menu_id === id && groupsChanged;
    if (affectsActiveMenu) {
      await client.query(
        `UPDATE households
         SET selection_status = 'open',
             selection_revision = selection_revision + 1
         WHERE id = $1`,
        [householdId]
      );
      await client.query(
        'DELETE FROM kid_selections WHERE household_id = $1',
        [householdId]
      );
    }

    await client.query('COMMIT');
    return { menu: rowToSavedMenu(row), affectsActiveMenu };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteMenu(
  householdId: string,
  id: string
): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if this is the active menu
    const { rows: householdRows } = await client.query<{ active_menu_id: string | null }>(
      'SELECT active_menu_id FROM households WHERE id = $1 FOR UPDATE',
      [householdId]
    );
    const wasActive = householdRows.length > 0 && householdRows[0].active_menu_id === id;

    // Delete the menu
    const { rowCount } = await client.query(
      'DELETE FROM menus WHERE id = $1 AND household_id = $2',
      [id, householdId]
    );

    if (rowCount === 0) {
      await client.query('ROLLBACK');
      return false;
    }

    // If deleted menu was active, clear active menu and selections
    if (wasActive) {
      await client.query(
        `UPDATE households
         SET active_menu_id = NULL,
             selection_status = 'open',
             selection_revision = selection_revision + 1
         WHERE id = $1`,
        [householdId]
      );
      await client.query(
        'DELETE FROM kid_selections WHERE household_id = $1',
        [householdId]
      );
    }

    await client.query('COMMIT');
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err, householdId, menuId: id }, 'Transaction failed in deleteMenu');
    throw err;
  } finally {
    client.release();
  }
}

// ============================================================
// Active Menu
// ============================================================

export async function getActiveMenu(
  householdId: string
): Promise<{
  menu: SavedMenu | null;
  selections: KidSelection[];
  selectionStatus: SelectionStatus;
  selectionRevision: number;
}> {
  // Get active_menu_id from households
  const { rows: householdRows } = await pool.query<HouseholdActiveRow>(
    `SELECT active_menu_id, selection_status, selection_revision
     FROM households
     WHERE id = $1`,
    [householdId]
  );

  if (householdRows.length === 0 || !householdRows[0].active_menu_id) {
    return {
      menu: null,
      selections: [],
      selectionStatus: householdRows[0]?.selection_status ?? 'open',
      selectionRevision: Number(householdRows[0]?.selection_revision ?? 0),
    };
  }

  const activeMenuId = householdRows[0].active_menu_id;
  const selectionStatus = householdRows[0].selection_status;

  // Get the menu and selections in parallel
  const [menuResult, selectionsResult] = await Promise.all([
    pool.query<MenuRow>(
      `SELECT ${MENU_COLUMNS} FROM menus WHERE id = $1 AND household_id = $2`,
      [activeMenuId, householdId]
    ),
    pool.query<KidSelectionRow>(
      `SELECT kid_id, selections, updated_at
       FROM kid_selections
       WHERE household_id = $1
       ORDER BY updated_at`,
      [householdId]
    ),
  ]);

  return {
    menu: menuResult.rows.length > 0 ? rowToSavedMenu(menuResult.rows[0]) : null,
    selections: selectionsResult.rows.map(rowToKidSelection),
    selectionStatus,
    selectionRevision: Number(householdRows[0].selection_revision),
  };
}

export async function setActiveMenu(
  householdId: string,
  menuId: string | null
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE households
       SET active_menu_id = $2,
           selection_status = 'open',
           selection_revision = selection_revision + 1
       WHERE id = $1`,
      [householdId, menuId]
    );
    await client.query(
      'DELETE FROM kid_selections WHERE household_id = $1',
      [householdId]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ============================================================
// Selections
// ============================================================

export async function addSelection(
  householdId: string,
  kidId: string,
  selections: GroupSelections,
  menuId: string,
  selectionRevision: number
): Promise<KidSelection> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Serialize kid edits with parent approval. Whichever obtains this row lock
    // first completes, and the second operation observes the resulting state.
    const { rows: householdRows } = await client.query<HouseholdActiveRow>(
      `SELECT active_menu_id, selection_status, selection_revision
       FROM households
       WHERE id = $1
       FOR UPDATE`,
      [householdId]
    );
    const household = householdRows[0];
    if (!household?.active_menu_id) {
      throw new MenuOperationError('There is no active menu', 409);
    }
    if (
      household.active_menu_id !== menuId
      || Number(household.selection_revision) !== selectionRevision
    ) {
      throw new MenuOperationError('The menu changed while these choices were being made', 409);
    }
    if (household.selection_status === 'approved') {
      throw new MenuOperationError('Choices have already been approved', 409);
    }

    const { rows: menuRows } = await client.query<MenuRow>(
      `SELECT ${MENU_COLUMNS}
       FROM menus
       WHERE id = $1 AND household_id = $2`,
      [household.active_menu_id, householdId]
    );
    if (menuRows.length === 0) {
      throw new MenuOperationError('The active menu is no longer available', 409);
    }
    validateSelections(menuRows[0].groups, selections);

    const kid = await client.query(
      'SELECT 1 FROM kid_profiles WHERE id = $1 AND household_id = $2',
      [kidId, householdId]
    );
    if (kid.rowCount === 0) {
      throw new MenuOperationError('Kid profile not found', 404);
    }

    const { rows } = await client.query<KidSelectionRow>(
      `INSERT INTO kid_selections (household_id, kid_id, selections)
       VALUES ($1, $2, $3)
       ON CONFLICT (household_id, kid_id) DO UPDATE
       SET selections = EXCLUDED.selections, updated_at = now()
       RETURNING kid_id, selections, updated_at`,
      [householdId, kidId, JSON.stringify(selections)]
    );
    await client.query('COMMIT');
    return rowToKidSelection(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function clearSelections(householdId: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE households
       SET selection_status = 'open',
           selection_revision = selection_revision + 1
       WHERE id = $1`,
      [householdId]
    );
    await client.query(
      'DELETE FROM kid_selections WHERE household_id = $1',
      [householdId]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function setSelectionStatus(
  householdId: string,
  status: SelectionStatus
): Promise<SelectionStatus> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: householdRows } = await client.query<{ active_menu_id: string | null }>(
      `SELECT active_menu_id
       FROM households
       WHERE id = $1
       FOR UPDATE`,
      [householdId]
    );
    if (!householdRows[0]?.active_menu_id) {
      throw new MenuOperationError('There is no active menu', 409);
    }

    if (status === 'approved') {
      const { rows: menuRows } = await client.query<MenuRow>(
        `SELECT ${MENU_COLUMNS}
         FROM menus
         WHERE id = $1 AND household_id = $2`,
        [householdRows[0].active_menu_id, householdId]
      );
      if (menuRows.length === 0) {
        throw new MenuOperationError('The active menu is no longer available', 409);
      }

      const { rows: selectionRows } = await client.query<KidSelectionRow>(
        `SELECT kid_id, selections, updated_at
         FROM kid_selections
         WHERE household_id = $1
         FOR UPDATE`,
        [householdId]
      );
      if (selectionRows.length === 0) {
        throw new MenuOperationError('There are no choices to approve', 409);
      }
      for (const selectionRow of selectionRows) {
        validateSelections(menuRows[0].groups, selectionRow.selections, 409);
      }
    }

    await client.query(
      'UPDATE households SET selection_status = $2 WHERE id = $1',
      [householdId, status]
    );
    await client.query('COMMIT');
    return status;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ============================================================
// Presets
// ============================================================

const VALID_PRESET_SLOTS: PresetSlot[] = ['breakfast', 'snack', 'dinner', 'custom'];

export function isValidPresetSlot(slot: string): slot is PresetSlot {
  return VALID_PRESET_SLOTS.includes(slot as PresetSlot);
}

export async function getPresets(
  householdId: string
): Promise<{ presets: Record<PresetSlot, SavedMenu | null> }> {
  const { rows } = await pool.query<MenuRow>(
    `SELECT ${MENU_COLUMNS} FROM menus
     WHERE household_id = $1 AND preset_slot IS NOT NULL
     ORDER BY created_at`,
    [householdId]
  );

  const presets: Record<PresetSlot, SavedMenu | null> = {
    breakfast: null,
    snack: null,
    dinner: null,
    custom: null,
  };

  for (const row of rows) {
    if (row.preset_slot && isValidPresetSlot(row.preset_slot)) {
      presets[row.preset_slot] = rowToSavedMenu(row);
    }
  }

  return { presets };
}

export async function updatePreset(
  householdId: string,
  slot: PresetSlot,
  name: string,
  groups: MenuGroup[],
  expectedUpdatedAt?: number | null
): Promise<MenuMutationResult> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: householdRows } = await client.query<{ active_menu_id: string | null }>(
      'SELECT active_menu_id FROM households WHERE id = $1 FOR UPDATE',
      [householdId]
    );
    const { rows: existingRows } = await client.query<MenuRow>(
      `SELECT ${MENU_COLUMNS}
       FROM menus
       WHERE household_id = $1 AND preset_slot = $2
       FOR UPDATE`,
      [householdId, slot]
    );

    let row: MenuRow;
    let groupsChanged = false;
    if (existingRows.length > 0) {
      if (
        expectedUpdatedAt !== undefined
        && (expectedUpdatedAt === null
          || new Date(existingRows[0].updated_at).getTime() !== expectedUpdatedAt)
      ) {
        throw new MenuOperationError('This preset was changed on another device. Reload it before saving.', 409);
      }
      groupsChanged = !isDeepStrictEqual(existingRows[0].groups, groups);
      const { rows } = await client.query<MenuRow>(
        `UPDATE menus
         SET name = $3, groups = $4
         WHERE household_id = $1 AND preset_slot = $2
         RETURNING ${MENU_COLUMNS}`,
        [householdId, slot, name, JSON.stringify(groups)]
      );
      row = rows[0];
    } else {
      if (expectedUpdatedAt !== undefined && expectedUpdatedAt !== null) {
        throw new MenuOperationError('This preset was changed on another device. Reload it before saving.', 409);
      }
      const { rows } = await client.query<MenuRow>(
        `INSERT INTO menus (household_id, name, groups, preset_slot)
         VALUES ($1, $2, $3, $4)
         RETURNING ${MENU_COLUMNS}`,
        [householdId, name, JSON.stringify(groups), slot]
      );
      row = rows[0];
    }

    const affectsActiveMenu = householdRows[0]?.active_menu_id === row.id && groupsChanged;
    if (affectsActiveMenu) {
      await client.query(
        `UPDATE households
         SET selection_status = 'open',
             selection_revision = selection_revision + 1
         WHERE id = $1`,
        [householdId]
      );
      await client.query(
        'DELETE FROM kid_selections WHERE household_id = $1',
        [householdId]
      );
    }

    await client.query('COMMIT');
    return { menu: rowToSavedMenu(row), affectsActiveMenu };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function deletePreset(
  householdId: string,
  slot: PresetSlot
): Promise<{ deleted: boolean; affectsActiveMenu: boolean }> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Find the preset
    const { rows: presetRows } = await client.query<{ id: string }>(
      'SELECT id FROM menus WHERE household_id = $1 AND preset_slot = $2',
      [householdId, slot]
    );

    if (presetRows.length === 0) {
      await client.query('ROLLBACK');
      return { deleted: false, affectsActiveMenu: false };
    }

    const presetId = presetRows[0].id;

    // Check if this preset is the active menu
    const { rows: householdRows } = await client.query<{ active_menu_id: string | null }>(
      'SELECT active_menu_id FROM households WHERE id = $1 FOR UPDATE',
      [householdId]
    );
    const wasActive = householdRows.length > 0 && householdRows[0].active_menu_id === presetId;

    // Delete the preset
    await client.query(
      'DELETE FROM menus WHERE id = $1 AND household_id = $2',
      [presetId, householdId]
    );

    // If deleted preset was active, clear active menu and selections
    if (wasActive) {
      await client.query(
        `UPDATE households
         SET active_menu_id = NULL,
             selection_status = 'open',
             selection_revision = selection_revision + 1
         WHERE id = $1`,
        [householdId]
      );
      await client.query(
        'DELETE FROM kid_selections WHERE household_id = $1',
        [householdId]
      );
    }

    await client.query('COMMIT');
    return { deleted: true, affectsActiveMenu: wasActive };
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err, householdId, slot }, 'Transaction failed in deletePreset');
    throw err;
  } finally {
    client.release();
  }
}

// ============================================================
// Household Preset Initialization (seeded presets for new users)
// ============================================================

interface PresetGroupDef {
  label: string;
  tags: string[];
  selectionPreset: SelectionPreset;
  limit: number;
}

interface PresetDef {
  slot: PresetSlot;
  name: string;
  groups: PresetGroupDef[];
}

const SEED_PRESETS: PresetDef[] = [
  {
    slot: 'breakfast',
    name: 'Breakfast',
    groups: [
      { label: 'Main', tags: ['Breakfast'], selectionPreset: 'pick-1-2', limit: 4 },
      { label: 'Fruit', tags: ['Fruit'], selectionPreset: 'pick-2-3', limit: 3 },
      { label: 'Drink', tags: ['Drink'], selectionPreset: 'pick-1', limit: 3 },
    ],
  },
  {
    slot: 'snack',
    name: 'Snack',
    groups: [
      { label: 'Snack', tags: ['Snack', 'Fruit'], selectionPreset: 'pick-1', limit: 3 },
      { label: 'Drink', tags: ['Drink'], selectionPreset: 'pick-1', limit: 3 },
    ],
  },
  {
    slot: 'dinner',
    name: 'Dinner',
    groups: [
      { label: 'Main', tags: ['Protein'], selectionPreset: 'pick-1', limit: 4 },
      { label: 'Sides', tags: ['Veggie'], selectionPreset: 'pick-1-2', limit: 4 },
      { label: 'Drink', tags: ['Drink'], selectionPreset: 'pick-1', limit: 3 },
    ],
  },
];

export async function initializeHouseholdPresets(householdId: string): Promise<void> {
  for (const preset of SEED_PRESETS) {
    const groups: MenuGroup[] = [];

    for (let i = 0; i < preset.groups.length; i++) {
      const groupDef = preset.groups[i];

      // Query household foods matching any of the group's tags
      const { rows } = await pool.query<{ id: string }>(
        `SELECT id FROM food_items
         WHERE household_id = $1 AND tags && $2::text[]
         ORDER BY random() LIMIT $3`,
        [householdId, groupDef.tags, groupDef.limit]
      );

      if (rows.length === 0) continue;

      groups.push({
        id: `seed-${preset.slot}-${i}`,
        label: groupDef.label,
        foodIds: rows.map((r) => r.id),
        selectionPreset: groupDef.selectionPreset,
        order: i,
        filterTags: groupDef.tags,
      });
    }

    if (groups.length > 0) {
      await updatePreset(householdId, preset.slot, preset.name, groups);
    }
  }

  logger.info({ householdId }, 'Initialized household presets');
}

export async function copyPreset(
  householdId: string,
  fromSlot: PresetSlot,
  toSlot: PresetSlot
): Promise<MenuMutationResult | null> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: householdRows } = await client.query<{ active_menu_id: string | null }>(
      'SELECT active_menu_id FROM households WHERE id = $1 FOR UPDATE',
      [householdId]
    );
    const { rows: sourceRows } = await client.query<MenuRow>(
      `SELECT ${MENU_COLUMNS}
       FROM menus
       WHERE household_id = $1 AND preset_slot = $2`,
      [householdId, fromSlot]
    );
    if (sourceRows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const source = sourceRows[0];
    const { rows: targetRows } = await client.query<MenuRow>(
      `SELECT ${MENU_COLUMNS}
       FROM menus
       WHERE household_id = $1 AND preset_slot = $2
       FOR UPDATE`,
      [householdId, toSlot]
    );

    let row: MenuRow;
    let groupsChanged = false;
    if (targetRows.length > 0) {
      groupsChanged = !isDeepStrictEqual(targetRows[0].groups, source.groups);
      const { rows } = await client.query<MenuRow>(
        `UPDATE menus
         SET name = $3, groups = $4
         WHERE household_id = $1 AND preset_slot = $2
         RETURNING ${MENU_COLUMNS}`,
        [householdId, toSlot, source.name, JSON.stringify(source.groups)]
      );
      row = rows[0];
    } else {
      const { rows } = await client.query<MenuRow>(
        `INSERT INTO menus (household_id, name, groups, preset_slot)
         VALUES ($1, $2, $3, $4)
         RETURNING ${MENU_COLUMNS}`,
        [householdId, source.name, JSON.stringify(source.groups), toSlot]
      );
      row = rows[0];
    }

    const affectsActiveMenu = householdRows[0]?.active_menu_id === row.id && groupsChanged;
    if (affectsActiveMenu) {
      await client.query(
        `UPDATE households
         SET selection_status = 'open',
             selection_revision = selection_revision + 1
         WHERE id = $1`,
        [householdId]
      );
      await client.query(
        'DELETE FROM kid_selections WHERE household_id = $1',
        [householdId]
      );
    }

    await client.query('COMMIT');
    return { menu: rowToSavedMenu(row), affectsActiveMenu };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
