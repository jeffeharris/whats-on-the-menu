import pool from '../pool.js';
import { logger } from '../../logger.js';

// ============================================================
// Types
// ============================================================

type SelectionPreset = 'pick-1' | 'pick-1-2' | 'pick-2' | 'pick-2-3';
type PresetSlot = 'breakfast' | 'snack' | 'dinner' | 'custom';

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
  created_at: string;
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
    timestamp: new Date(row.created_at).getTime(),
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
      'UPDATE households SET active_menu_id = $2 WHERE id = $1',
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
): Promise<SavedMenu | null> {
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

  if (setClauses.length === 0) {
    const { rows } = await pool.query<MenuRow>(
      `SELECT ${MENU_COLUMNS} FROM menus WHERE id = $1 AND household_id = $2`,
      [id, householdId]
    );
    return rows.length > 0 ? rowToSavedMenu(rows[0]) : null;
  }

  const idParam = paramIndex++;
  const householdParam = paramIndex++;
  values.push(id, householdId);

  const { rows } = await pool.query<MenuRow>(
    `UPDATE menus
     SET ${setClauses.join(', ')}
     WHERE id = $${idParam} AND household_id = $${householdParam}
     RETURNING ${MENU_COLUMNS}`,
    values
  );
  return rows.length > 0 ? rowToSavedMenu(rows[0]) : null;
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
      'SELECT active_menu_id FROM households WHERE id = $1',
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
        'UPDATE households SET active_menu_id = NULL WHERE id = $1',
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
): Promise<{ menu: SavedMenu | null; selections: KidSelection[] }> {
  // Get active_menu_id from households
  const { rows: householdRows } = await pool.query<{ active_menu_id: string | null }>(
    'SELECT active_menu_id FROM households WHERE id = $1',
    [householdId]
  );

  if (householdRows.length === 0 || !householdRows[0].active_menu_id) {
    return { menu: null, selections: [] };
  }

  const activeMenuId = householdRows[0].active_menu_id;

  // Get the menu and selections in parallel
  const [menuResult, selectionsResult] = await Promise.all([
    pool.query<MenuRow>(
      `SELECT ${MENU_COLUMNS} FROM menus WHERE id = $1 AND household_id = $2`,
      [activeMenuId, householdId]
    ),
    pool.query<KidSelectionRow>(
      'SELECT kid_id, selections, created_at FROM kid_selections WHERE household_id = $1',
      [householdId]
    ),
  ]);

  return {
    menu: menuResult.rows.length > 0 ? rowToSavedMenu(menuResult.rows[0]) : null,
    selections: selectionsResult.rows.map(rowToKidSelection),
  };
}

export async function setActiveMenu(
  householdId: string,
  menuId: string | null
): Promise<void> {
  await pool.query(
    'UPDATE households SET active_menu_id = $2 WHERE id = $1',
    [householdId, menuId]
  );
  // Clear selections when changing active menu
  await pool.query(
    'DELETE FROM kid_selections WHERE household_id = $1',
    [householdId]
  );
}

// ============================================================
// Selections
// ============================================================

export async function addSelection(
  householdId: string,
  kidId: string,
  selections: GroupSelections
): Promise<KidSelection> {
  const { rows } = await pool.query<KidSelectionRow>(
    `INSERT INTO kid_selections (household_id, kid_id, selections)
     VALUES ($1, $2, $3)
     ON CONFLICT (household_id, kid_id) DO UPDATE
     SET selections = $3
     RETURNING kid_id, selections, created_at`,
    [householdId, kidId, JSON.stringify(selections)]
  );
  return rowToKidSelection(rows[0]);
}

export async function clearSelections(householdId: string): Promise<void> {
  await pool.query(
    'DELETE FROM kid_selections WHERE household_id = $1',
    [householdId]
  );
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
  groups: MenuGroup[]
): Promise<SavedMenu> {
  // Try to update existing preset first
  const { rows: updateRows } = await pool.query<MenuRow>(
    `UPDATE menus
     SET name = $3, groups = $4
     WHERE household_id = $1 AND preset_slot = $2
     RETURNING ${MENU_COLUMNS}`,
    [householdId, slot, name, JSON.stringify(groups)]
  );

  if (updateRows.length > 0) {
    return rowToSavedMenu(updateRows[0]);
  }

  // Create new preset
  const { rows: insertRows } = await pool.query<MenuRow>(
    `INSERT INTO menus (household_id, name, groups, preset_slot)
     VALUES ($1, $2, $3, $4)
     RETURNING ${MENU_COLUMNS}`,
    [householdId, name, JSON.stringify(groups), slot]
  );
  return rowToSavedMenu(insertRows[0]);
}

export async function deletePreset(
  householdId: string,
  slot: PresetSlot
): Promise<boolean> {
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
      return false;
    }

    const presetId = presetRows[0].id;

    // Check if this preset is the active menu
    const { rows: householdRows } = await client.query<{ active_menu_id: string | null }>(
      'SELECT active_menu_id FROM households WHERE id = $1',
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
        'UPDATE households SET active_menu_id = NULL WHERE id = $1',
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
    logger.error({ err, householdId, slot }, 'Transaction failed in deletePreset');
    throw err;
  } finally {
    client.release();
  }
}

export async function copyPreset(
  householdId: string,
  fromSlot: PresetSlot,
  toSlot: PresetSlot
): Promise<SavedMenu | null> {
  // Get source preset
  const { rows: sourceRows } = await pool.query<MenuRow>(
    `SELECT ${MENU_COLUMNS} FROM menus WHERE household_id = $1 AND preset_slot = $2`,
    [householdId, fromSlot]
  );

  if (sourceRows.length === 0) {
    return null;
  }

  const source = sourceRows[0];

  // Try to update existing target preset first
  const { rows: updateRows } = await pool.query<MenuRow>(
    `UPDATE menus
     SET name = $3, groups = $4
     WHERE household_id = $1 AND preset_slot = $2
     RETURNING ${MENU_COLUMNS}`,
    [householdId, toSlot, source.name, JSON.stringify(source.groups)]
  );

  if (updateRows.length > 0) {
    return rowToSavedMenu(updateRows[0]);
  }

  // Create new preset in target slot
  const { rows: insertRows } = await pool.query<MenuRow>(
    `INSERT INTO menus (household_id, name, groups, preset_slot)
     VALUES ($1, $2, $3, $4)
     RETURNING ${MENU_COLUMNS}`,
    [householdId, source.name, JSON.stringify(source.groups), toSlot]
  );
  return rowToSavedMenu(insertRows[0]);
}
