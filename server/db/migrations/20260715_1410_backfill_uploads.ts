import type { PoolClient } from 'pg';
import { statSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

export const DESCRIPTION = 'Backfill uploads rows from existing /uploads/ image references';
export const DEPENDS_ON = '20260715_1400_create_uploads_table';

const __dirname = dirname(fileURLToPath(import.meta.url));
// server/db/migrations -> repo root -> data/uploads
const UPLOADS_DIR = process.env.UPLOADS_DIR || join(__dirname, '..', '..', '..', 'data', 'uploads');

/** '/uploads/<uuid>.jpg' -> '<uuid>.jpg', or null if malformed / traversal. */
function filenameFromUrl(url: string): string | null {
  if (!url.startsWith('/uploads/')) return null;
  const filename = url.slice('/uploads/'.length);
  if (!filename || filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
    return null;
  }
  return filename;
}

function fileSize(filename: string): number {
  try {
    return statSync(join(UPLOADS_DIR, filename)).size;
  } catch {
    return 0; // File missing on disk — record it with size 0 so ownership still works.
  }
}

export async function upgrade(client: PoolClient): Promise<void> {
  // Every (household_id, /uploads/ url) reference across food_items and the
  // inline options inside shared_menus groups.
  const { rows } = await client.query<{ household_id: string; image_url: string }>(`
    SELECT household_id, image_url
    FROM food_items
    WHERE image_url LIKE '/uploads/%'
    UNION
    SELECT sm.household_id, opt->>'imageUrl' AS image_url
    FROM shared_menus sm,
         jsonb_array_elements(sm.groups) AS grp,
         jsonb_array_elements(grp->'options') AS opt
    WHERE opt->>'imageUrl' LIKE '/uploads/%'
  `);

  for (const { household_id, image_url } of rows) {
    const filename = filenameFromUrl(image_url);
    if (!filename) continue;
    await client.query(
      `INSERT INTO uploads (household_id, filename, size_bytes)
       VALUES ($1, $2, $3)
       ON CONFLICT (filename) DO NOTHING`,
      [household_id, filename, fileSize(filename)],
    );
  }
}
