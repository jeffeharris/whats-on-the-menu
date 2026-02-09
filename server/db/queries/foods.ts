import pool from '../pool.js';

export interface FoodItemRow {
  id: string;
  name: string;
  image_url: string | null;
  tags: string[];
}

interface FoodItem {
  id: string;
  name: string;
  imageUrl: string | null;
  tags: string[];
}

function rowToFoodItem(row: FoodItemRow): FoodItem {
  return {
    id: row.id,
    name: row.name,
    imageUrl: row.image_url,
    tags: row.tags,
  };
}

export async function getAllFoods(householdId: string): Promise<{ items: FoodItem[] }> {
  const { rows } = await pool.query<FoodItemRow>(
    'SELECT id, name, image_url, tags FROM food_items WHERE household_id = $1 ORDER BY created_at',
    [householdId]
  );
  return { items: rows.map(rowToFoodItem) };
}

export async function createFood(
  householdId: string,
  name: string,
  tags: string[],
  imageUrl: string | null
): Promise<FoodItem> {
  const { rows } = await pool.query<FoodItemRow>(
    `INSERT INTO food_items (household_id, name, tags, image_url)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, image_url, tags`,
    [householdId, name, tags, imageUrl]
  );
  return rowToFoodItem(rows[0]);
}

export async function updateFood(
  householdId: string,
  id: string,
  updates: Partial<{ name: string; tags: string[]; imageUrl: string | null }>
): Promise<FoodItem | null> {
  // Build SET clause dynamically from provided updates
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (updates.name !== undefined) {
    setClauses.push(`name = $${paramIndex++}`);
    values.push(updates.name);
  }
  if (updates.tags !== undefined) {
    setClauses.push(`tags = $${paramIndex++}`);
    values.push(updates.tags);
  }
  if (updates.imageUrl !== undefined) {
    setClauses.push(`image_url = $${paramIndex++}`);
    values.push(updates.imageUrl);
  }

  if (setClauses.length === 0) {
    // No fields to update — just return the current row
    const { rows } = await pool.query<FoodItemRow>(
      'SELECT id, name, image_url, tags FROM food_items WHERE id = $1 AND household_id = $2',
      [id, householdId]
    );
    return rows.length > 0 ? rowToFoodItem(rows[0]) : null;
  }

  // Add id and household_id as the final params
  const idParam = paramIndex++;
  const householdParam = paramIndex++;
  values.push(id, householdId);

  const { rows } = await pool.query<FoodItemRow>(
    `UPDATE food_items
     SET ${setClauses.join(', ')}
     WHERE id = $${idParam} AND household_id = $${householdParam}
     RETURNING id, name, image_url, tags`,
    values
  );
  return rows.length > 0 ? rowToFoodItem(rows[0]) : null;
}

export async function initializeHouseholdFoods(householdId: string): Promise<number> {
  const { rowCount } = await pool.query(
    `INSERT INTO food_items (household_id, name, tags, image_url)
     SELECT $1, name, tags, image_url
     FROM seed_food_templates`,
    [householdId]
  );
  return rowCount ?? 0;
}

export async function deleteFood(
  householdId: string,
  id: string
): Promise<FoodItem | null> {
  const { rows } = await pool.query<FoodItemRow>(
    `DELETE FROM food_items
     WHERE id = $1 AND household_id = $2
     RETURNING id, name, image_url, tags`,
    [id, householdId]
  );
  return rows.length > 0 ? rowToFoodItem(rows[0]) : null;
}
