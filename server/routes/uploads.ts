import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { existsSync, mkdirSync, unlinkSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { generateId } from '../storage.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = join(__dirname, '..', '..', 'data', 'uploads');

// Ensure uploads directory exists
if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Storage limit configuration (in bytes)
const STORAGE_LIMIT_MB = parseInt(process.env.UPLOAD_STORAGE_LIMIT_MB || '25', 10);
const STORAGE_LIMIT_BYTES = STORAGE_LIMIT_MB * 1024 * 1024;
const WARNING_THRESHOLD = 0.8;

// Image processing configuration
const MAX_DIMENSION = 800;
const JPEG_QUALITY = 80;

// Configure multer for memory storage (we'll process before saving)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB max upload size
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.'));
    }
  },
});

// Calculate total size of uploads directory
export function getUploadsDirectorySize(): number {
  if (!existsSync(UPLOADS_DIR)) {
    return 0;
  }

  try {
    const files = readdirSync(UPLOADS_DIR);
    return files.reduce((total, file) => {
      const filepath = join(UPLOADS_DIR, file);
      try {
        const stats = statSync(filepath);
        return total + stats.size;
      } catch {
        return total;
      }
    }, 0);
  } catch {
    return 0;
  }
}

// Get storage stats
function getStorageStats() {
  const used = getUploadsDirectorySize();
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

// Delete an uploaded file by filename
export function deleteUploadedFile(filename: string): boolean {
  const filepath = join(UPLOADS_DIR, filename);
  if (existsSync(filepath)) {
    try {
      unlinkSync(filepath);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

const router = Router();

// GET /api/uploads/storage - Get storage usage stats
router.get('/storage', (_req, res) => {
  const stats = getStorageStats();
  res.json(stats);
});

// POST /api/uploads - Upload and process an image
router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Check storage limit before processing
    const currentSize = getUploadsDirectorySize();
    if (currentSize >= STORAGE_LIMIT_BYTES) {
      return res.status(507).json({
        error: 'Storage limit reached. Please delete some images before uploading new ones.',
        storage: getStorageStats(),
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

    // Check if processed image would exceed storage limit
    if (currentSize + processedImage.length > STORAGE_LIMIT_BYTES) {
      return res.status(507).json({
        error: 'Uploading this image would exceed the storage limit. Please delete some images first.',
        storage: getStorageStats(),
      });
    }

    // Generate unique filename and save
    const filename = `${generateId()}.jpg`;
    const filepath = join(UPLOADS_DIR, filename);

    await sharp(processedImage).toFile(filepath);

    const imageUrl = `/uploads/${filename}`;
    const stats = getStorageStats();

    res.status(201).json({
      imageUrl,
      filename,
      storage: stats,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to process and save image' });
  }
});

// DELETE /api/uploads/:filename - Delete an uploaded image
router.delete('/:filename', (req, res) => {
  const { filename } = req.params;

  // Security: ensure filename doesn't contain path traversal
  if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  const deleted = deleteUploadedFile(filename);
  if (deleted) {
    res.json({ success: true, storage: getStorageStats() });
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

export default router;
