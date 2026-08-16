import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import { logger } from '../logger.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  getHouseholdUploadBytes,
  recordUpload,
  deleteUploadRecord,
} from '../db/queries/uploads.js';

// Filename format validation (UUID + .jpg)
const VALID_FILENAME_PATTERN = /^[a-z0-9-]{20,40}\.jpg$/;

const __dirname = dirname(fileURLToPath(import.meta.url));
// Overridable via env so tests can point at a throwaway directory.
export const UPLOADS_DIR = process.env.UPLOADS_DIR || join(__dirname, '..', '..', 'data', 'uploads');

// Ensure uploads directory exists
if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Per-household storage limit configuration (in bytes)
const STORAGE_LIMIT_MB = parseInt(process.env.UPLOAD_STORAGE_LIMIT_MB || '25', 10);
export const STORAGE_LIMIT_BYTES = STORAGE_LIMIT_MB * 1024 * 1024;
const WARNING_THRESHOLD = 0.8;

// Image processing configuration
export const MAX_DIMENSION = 800;
export const JPEG_QUALITY = 80;

/** Thrown when an operation would push a household past its storage limit. */
export class QuotaExceededError extends Error {
  constructor(public readonly householdId: string) {
    super('Storage limit reached');
    this.name = 'QuotaExceededError';
  }
}

// Configure multer for memory storage (we'll process before saving)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB max upload size
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
    }
  },
});

// Per-household storage stats
export async function getStorageStats(householdId: string) {
  const used = await getHouseholdUploadBytes(householdId);
  const limit = STORAGE_LIMIT_BYTES;
  const percentage = (used / limit) * 100;
  const warning = percentage >= WARNING_THRESHOLD * 100;

  return {
    used,
    limit,
    percentage: Math.round(percentage * 100) / 100,
    warning,
    limitMB: STORAGE_LIMIT_MB,
    usedMB: Math.round((used / (1024 * 1024)) * 100) / 100,
  };
}

/**
 * Throw QuotaExceededError if storing `incomingBytes` more would push the
 * household past its limit. Pass 0 to check whether it is already at/over.
 */
export async function assertWithinQuota(householdId: string, incomingBytes: number): Promise<void> {
  const used = await getHouseholdUploadBytes(householdId);
  const wouldExceed = incomingBytes === 0
    ? used >= STORAGE_LIMIT_BYTES
    : used + incomingBytes > STORAGE_LIMIT_BYTES;
  if (wouldExceed) {
    throw new QuotaExceededError(householdId);
  }
}

// Low-level file deletion by filename (no ownership check — callers must scope).
// Returns false if the file was absent or could not be removed; a removal
// failure (vs. a legitimately-absent file) is logged.
export function deleteUploadedFile(filename: string): boolean {
  const filepath = join(UPLOADS_DIR, filename);
  if (!existsSync(filepath)) {
    return false;
  }
  try {
    unlinkSync(filepath);
    return true;
  } catch (err) {
    logger.error({ err, filename }, 'Failed to unlink upload file');
    return false;
  }
}

/**
 * Delete an upload owned by a household: removes the DB record (scoped to the
 * household) and, only if that household actually owned it, the file on disk.
 * If the record is removed but the file lingers (unlink failure), the orphan is
 * logged so it can be reaped — the DB row is authoritative for the quota.
 * Returns true if the household owned and deleted the upload.
 */
export async function deleteHouseholdUpload(householdId: string, filename: string): Promise<boolean> {
  const owned = await deleteUploadRecord({ householdId, filename });
  if (owned) {
    const filepath = join(UPLOADS_DIR, filename);
    if (existsSync(filepath) && !deleteUploadedFile(filename)) {
      logger.error({ householdId, filename }, 'Upload record deleted but file remained on disk (orphan)');
    }
  }
  return owned;
}

// Record a stored image against a household after writing it to disk.
export async function registerUpload(
  householdId: string,
  filename: string,
  sizeBytes: number,
): Promise<void> {
  await recordUpload({ householdId, filename }, sizeBytes);
}

const router = Router();

// GET /api/uploads/storage - Get this household's storage usage stats
router.get('/storage', asyncHandler(async (req, res) => {
  const stats = await getStorageStats(req.householdId!);
  res.json(stats);
}));

// POST /api/uploads - Upload and process an image
router.post('/', upload.single('image'), asyncHandler(async (req, res) => {
  const householdId = req.householdId!;
  if (!req.file) {
    return res.status(400).json({ error: 'No image file provided' });
  }

  // Check this household's storage usage before processing
  const currentSize = await getHouseholdUploadBytes(householdId);
  if (currentSize >= STORAGE_LIMIT_BYTES) {
    return res.status(507).json({
      error: 'Storage limit reached. Please delete some images before uploading new ones.',
      storage: await getStorageStats(householdId),
    });
  }

  // Process the image with sharp
  const processedImage = await sharp(req.file.buffer)
    .resize(MAX_DIMENSION, MAX_DIMENSION, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();

  // Check if processed image would exceed this household's storage limit
  if (currentSize + processedImage.length > STORAGE_LIMIT_BYTES) {
    return res.status(507).json({
      error: 'Uploading this image would exceed the storage limit. Please delete some images first.',
      storage: await getStorageStats(householdId),
    });
  }

  // Generate unique filename and save
  const filename = `${randomUUID()}.jpg`;
  const filepath = join(UPLOADS_DIR, filename);

  // Write the processed buffer directly (avoid double Sharp processing)
  writeFileSync(filepath, processedImage);
  try {
    await registerUpload(householdId, filename, processedImage.length);
  } catch (err) {
    // DB record failed — remove the just-written file so it isn't orphaned.
    deleteUploadedFile(filename);
    throw err;
  }

  const imageUrl = `/uploads/${filename}`;
  const stats = await getStorageStats(householdId);

  res.status(201).json({
    imageUrl,
    filename,
    storage: stats,
  });
}, 'Failed to process and save image'));

// DELETE /api/uploads/:filename - Delete an uploaded image owned by this household
router.delete('/:filename', asyncHandler(async (req, res) => {
  const { filename } = req.params;

  // Security: validate filename format and prevent path traversal
  if (!VALID_FILENAME_PATTERN.test(filename)) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  // Ownership: only the owning household may delete its file. Unowned/foreign
  // files return 404 (no distinction, to avoid revealing another tenant's file).
  const deleted = await deleteHouseholdUpload(req.householdId!, filename);
  if (deleted) {
    res.json({ success: true, storage: await getStorageStats(req.householdId!) });
  } else {
    res.status(404).json({ error: 'File not found' });
  }
}));

export default router;
