import { randomBytes } from 'crypto';
import pool from '../pool.js';

// ---- Types (API shapes) ----

interface SharedMenuOption {
  id: string;
  text: string;
  imageUrl: string | null;
  order: number;
}

interface SharedMenuGroup {
  id: string;
  label: string;
  options: SharedMenuOption[];
  selectionPreset: string;
  order: number;
}

interface SharedMenu {
  id: string;
  token: string;
  title: string;
  description?: string;
  groups: SharedMenuGroup[];
  createdAt: number;
  isActive: boolean;
}

interface SharedMenuResponse {
  id: string;
  menuId: string;
  respondentName: string;
  selections: { [groupId: string]: string[] };
  timestamp: number;
}

// ---- Row → API mappers ----

function rowToSharedMenu(row: Record<string, unknown>): SharedMenu {
  const menu: SharedMenu = {
    id: 'sm_' + (row.id as string),
    token: row.token as string,
    title: row.title as string,
    groups: row.groups as SharedMenuGroup[],
    createdAt: new Date(row.created_at as string).getTime(),
    isActive: row.is_active as boolean,
  };
  if (row.description != null) {
    menu.description = row.description as string;
  }
  return menu;
}

function rowToResponse(row: Record<string, unknown>): SharedMenuResponse {
  return {
    id: 'sr_' + (row.id as string),
    menuId: 'sm_' + (row.menu_id as string),
    respondentName: row.respondent_name as string,
    selections: row.selections as { [groupId: string]: string[] },
    timestamp: new Date(row.created_at as string).getTime(),
  };
}

/** Strip the `sm_` prefix to get the raw UUID for DB queries. */
function stripMenuPrefix(id: string): string {
  return id.startsWith('sm_') ? id.slice(3) : id;
}

// ---- Token generation ----

function generateToken(): string {
  return randomBytes(6).toString('base64url').substring(0, 8);
}

// ---- Query functions ----

export async function createSharedMenu(
  householdId: string,
  title: string,
  description: string | undefined,
  groups: SharedMenuGroup[],
): Promise<SharedMenu> {
  // Retry loop for token uniqueness collisions (UNIQUE constraint)
  for (let attempt = 0; attempt < 5; attempt++) {
    const token = generateToken();
    try {
      const { rows } = await pool.query(
        `INSERT INTO shared_menus (household_id, token, title, description, groups)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, token, title, description, groups, is_active, created_at`,
        [householdId, token, title, description ?? null, JSON.stringify(groups)],
      );
      return rowToSharedMenu(rows[0]);
    } catch (err: unknown) {
      const pgErr = err as { code?: string };
      // 23505 = unique_violation — retry with a new token
      if (pgErr.code === '23505' && attempt < 4) continue;
      throw err;
    }
  }
  throw new Error('Failed to generate unique token');
}

export async function getAllSharedMenus(
  householdId: string,
): Promise<{ menus: SharedMenu[] }> {
  const { rows } = await pool.query(
    `SELECT id, token, title, description, groups, is_active, created_at
     FROM shared_menus
     WHERE household_id = $1
     ORDER BY created_at DESC`,
    [householdId],
  );
  return { menus: rows.map(rowToSharedMenu) };
}

export async function getSharedMenuById(
  householdId: string,
  id: string,
): Promise<SharedMenu | null> {
  const rawId = stripMenuPrefix(id);
  const { rows } = await pool.query(
    `SELECT id, token, title, description, groups, is_active, created_at
     FROM shared_menus
     WHERE id = $1 AND household_id = $2`,
    [rawId, householdId],
  );
  return rows.length > 0 ? rowToSharedMenu(rows[0]) : null;
}

export async function getSharedMenuByToken(
  token: string,
): Promise<SharedMenu | null> {
  const { rows } = await pool.query(
    `SELECT id, token, title, description, groups, is_active, created_at
     FROM shared_menus
     WHERE token = $1 AND is_active = true`,
    [token],
  );
  return rows.length > 0 ? rowToSharedMenu(rows[0]) : null;
}

export async function updateSharedMenu(
  householdId: string,
  id: string,
  updates: Partial<{ title: string; description: string; groups: SharedMenuGroup[]; isActive: boolean }>,
): Promise<SharedMenu | null> {
  const rawId = stripMenuPrefix(id);

  const fieldMap: Record<string, string> = {
    title: 'title',
    description: 'description',
    groups: 'groups',
    isActive: 'is_active',
  };

  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  for (const [camel, column] of Object.entries(fieldMap)) {
    const value = (updates as Record<string, unknown>)[camel];
    if (value !== undefined) {
      setClauses.push(`${column} = $${paramIndex}`);
      values.push(column === 'groups' ? JSON.stringify(value) : value);
      paramIndex++;
    }
  }

  if (setClauses.length === 0) {
    const { rows } = await pool.query(
      `SELECT id, token, title, description, groups, is_active, created_at
       FROM shared_menus
       WHERE id = $1 AND household_id = $2`,
      [rawId, householdId],
    );
    return rows.length > 0 ? rowToSharedMenu(rows[0]) : null;
  }

  values.push(rawId, householdId);

  const { rows } = await pool.query(
    `UPDATE shared_menus
     SET ${setClauses.join(', ')}
     WHERE id = $${paramIndex} AND household_id = $${paramIndex + 1}
     RETURNING id, token, title, description, groups, is_active, created_at`,
    values,
  );

  return rows.length > 0 ? rowToSharedMenu(rows[0]) : null;
}

export async function deleteSharedMenu(
  householdId: string,
  id: string,
): Promise<boolean> {
  const rawId = stripMenuPrefix(id);
  const result = await pool.query(
    'DELETE FROM shared_menus WHERE id = $1 AND household_id = $2',
    [rawId, householdId],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function getResponses(
  menuId: string,
): Promise<{ responses: SharedMenuResponse[] }> {
  const rawId = stripMenuPrefix(menuId);
  const { rows } = await pool.query(
    `SELECT id, menu_id, respondent_name, selections, created_at
     FROM shared_menu_responses
     WHERE menu_id = $1
     ORDER BY created_at`,
    [rawId],
  );
  return { responses: rows.map(rowToResponse) };
}

export async function submitResponse(
  token: string,
  respondentName: string,
  selections: { [groupId: string]: string[] },
): Promise<{ menu: SharedMenu; response: SharedMenuResponse }> {
  // Look up the active menu by token
  const { rows: menuRows } = await pool.query(
    `SELECT id, token, title, description, groups, is_active, created_at
     FROM shared_menus
     WHERE token = $1 AND is_active = true`,
    [token],
  );

  if (menuRows.length === 0) {
    throw Object.assign(new Error('Menu not found'), { statusCode: 404 });
  }

  const menu = rowToSharedMenu(menuRows[0]);
  const rawMenuId = menuRows[0].id as string;

  const { rows } = await pool.query(
    `INSERT INTO shared_menu_responses (menu_id, respondent_name, selections)
     VALUES ($1, $2, $3)
     RETURNING id, menu_id, respondent_name, selections, created_at`,
    [rawMenuId, respondentName, JSON.stringify(selections)],
  );

  return { menu, response: rowToResponse(rows[0]) };
}
