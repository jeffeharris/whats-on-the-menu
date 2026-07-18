import type { PoolClient } from 'pg';
import { statSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../../logger.js';

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

interface SizeResult {
  size: number;
  missing: boolean; // file expected but not on disk (recorded as size 0)
}

function fileSize(filename: string): SizeResult {
  try {
    return { size: statSync(join(UPLOADS_DIR, filename)).size, missing: false };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      // File missing on disk — record with size 0 so ownership still works.
      return { size: 0, missing: true };
    }
    // Anything else (EACCES/EIO, or a wrong UPLOADS_DIR) is a real problem: log
    // it so a wholesale failure that would zero every quota isn't silent.
    logger.warn({ err, filename, uploadsDir: UPLOADS_DIR }, 'backfill: could not stat upload file, recording size 0');
    return { size: 0, missing: true };
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

  let inserted = 0;
  let missingFiles = 0;
  let skippedUrls = 0;
  for (const { household_id, image_url } of rows) {
    const filename = filenameFromUrl(image_url);
    if (!filename) {
      skippedUrls++; // malformed / traversal-shaped reference
      continue;
    }
    const { size, missing } = fileSize(filename);
    if (missing) missingFiles++;
    const { rowCount } = await client.query(
      `INSERT INTO uploads (household_id, filename, size_bytes)
       VALUES ($1, $2, $3)
       ON CONFLICT (filename) DO NOTHING`,
      [household_id, filename, size],
    );
    inserted += rowCount ?? 0;
  }

  logger.info(
    { referenced: rows.length, inserted, missingFiles, skippedUrls },
    'backfill_uploads complete',
  );
}
