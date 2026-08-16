import { Router } from 'express';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { logger } from '../logger.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  UPLOADS_DIR,
  MAX_DIMENSION,
  JPEG_QUALITY,
  registerUpload,
  assertWithinQuota,
  getStorageStats,
  QuotaExceededError,
} from './uploads.js';
import {
  reserveGeneration,
  releaseGeneration,
  countHouseholdGenerations,
} from '../db/queries/image-generations.js';

const router = Router();

// The one model we buy images from. Z-Image Turbo is sub-second and priced at
// roughly $0.0034/megapixel — about $0.0005 for the 400x400 images this app
// requests. Server-side only: the client never chooses a model, so a crafted
// request can't switch us onto an expensive one.
const MODEL = process.env.RUNWARE_MODEL || 'runware:z-image@turbo';

// Spend guardrails. Both caps are counted over a rolling 24h window (no
// timezone/reset-hour edge cases). At ~$0.0005 an image the defaults bound
// worst-case spend to roughly $0.50/day globally.
const GENERATION_WINDOW_MS = 24 * 60 * 60 * 1000;
const HOUSEHOLD_DAILY_LIMIT = parseInt(process.env.IMAGE_GEN_DAILY_LIMIT_HOUSEHOLD || '50', 10);
const GLOBAL_DAILY_LIMIT = parseInt(process.env.IMAGE_GEN_DAILY_LIMIT_GLOBAL || '1000', 10);
// Kill switch: set IMAGE_GEN_ENABLED=false to stop all paid generation without
// a redeploy of the client.
const GENERATION_ENABLED = process.env.IMAGE_GEN_ENABLED !== 'false';

// Runware requires dimensions to be multiples of 64
function roundToMultipleOf64(value: number): number {
  return Math.round(value / 64) * 64;
}

// Download an image from an external URL, process it, save locally, and record
// it against the household so it counts toward that household's storage quota.
// Throws QuotaExceededError if storing it would exceed the household's limit.
async function downloadAndSaveImage(
  householdId: string,
  url: string,
  timeoutMs = 30000,
): Promise<string> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (buffer.length === 0) {
    throw new Error('Downloaded image is empty');
  }

  const processedImage = await sharp(buffer)
    .resize(MAX_DIMENSION, MAX_DIMENSION, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();

  // Enforce the household storage quota (generated images count toward it).
  await assertWithinQuota(householdId, processedImage.length);

  const filename = `${randomUUID()}.jpg`;
  const filepath = join(UPLOADS_DIR, filename);
  writeFileSync(filepath, processedImage);
  await registerUpload(householdId, filename, processedImage.length);

  return `/uploads/${filename}`;
}

// Map a storage-quota failure to a 507 response; returns true if handled.
async function handleQuotaError(err: unknown, res: import('express').Response): Promise<boolean> {
  if (err instanceof QuotaExceededError) {
    res.status(507).json({
      error: 'Storage limit reached. Please delete some images before generating new ones.',
      storage: await getStorageStats(err.householdId),
    });
    return true;
  }
  return false;
}

// GET /api/image-generation/usage - This household's remaining daily allowance
router.get('/usage', asyncHandler(async (req, res) => {
  const used = await countHouseholdGenerations(req.householdId!, GENERATION_WINDOW_MS);
  res.json({
    used,
    limit: HOUSEHOLD_DAILY_LIMIT,
    remaining: Math.max(0, HOUSEHOLD_DAILY_LIMIT - used),
    enabled: GENERATION_ENABLED,
  });
}));

// POST /api/image-generation/runware - Proxy to Runware API
router.post('/runware', asyncHandler(async (req, res) => {
  const apiKey = process.env.RUNWARE_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Runware API key not configured' });
  }

  if (!GENERATION_ENABLED) {
    return res.status(503).json({
      error: 'Image generation is temporarily unavailable. You can still upload your own photos.',
    });
  }

  const { prompt, width = 512, height = 512, seed } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  // Storage quota first: it's a local check, and an out-of-space household
  // shouldn't burn a generation slot on a request that can't be stored anyway.
  try {
    await assertWithinQuota(req.householdId!, 0);
  } catch (error) {
    if (await handleQuotaError(error, res)) return;
    logger.error({ err: error }, 'Storage quota pre-check failed');
    return res.status(500).json({ error: 'Failed to generate image' });
  }

  // Claim a slot against the caps *before* spending money. Released again
  // below if the provider never returns an image.
  const reservation = await reserveGeneration(
    req.householdId!,
    MODEL,
    HOUSEHOLD_DAILY_LIMIT,
    GLOBAL_DAILY_LIMIT,
    GENERATION_WINDOW_MS,
  );

  if (!reservation.ok) {
    logger.warn(
      { householdId: req.householdId, reason: reservation.reason },
      'Image generation cap reached',
    );
    return res.status(429).json({
      error:
        reservation.reason === 'household_limit'
          ? `You've used all ${HOUSEHOLD_DAILY_LIMIT} AI images for today. You can still upload your own photos — the limit resets 24 hours after each image.`
          : 'AI image generation is busy right now. Please try again later, or upload your own photo.',
    });
  }

  // Flips once Runware has actually produced an image (i.e. we've been
  // charged). A failure after that point must keep the reservation.
  let billed = false;

  try {
    const taskUUID = randomUUID();

    // Runware REST API - payload is a JSON array of tasks
    // Using Bearer auth header as documented
    // Dimensions must be multiples of 64, between 128-2048
    const runwareWidth = Math.max(128, Math.min(roundToMultipleOf64(width), 2048));
    const runwareHeight = Math.max(128, Math.min(roundToMultipleOf64(height), 2048));

    const response = await fetch('https://api.runware.ai/v1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify([
        {
          taskType: 'imageInference',
          taskUUID,
          positivePrompt: prompt,
          width: runwareWidth,
          height: runwareHeight,
          model: MODEL,
          numberResults: 1,
          ...(seed !== undefined && { seed }),
        },
      ]),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.error({ status: response.status, errorData }, 'Runware API error');
      await releaseGeneration(reservation.id);
      return res.status(response.status).json({
        error: errorData.errors?.[0]?.message || `Runware API error: ${response.status}`,
      });
    }

    const data = await response.json();

    // Check for errors in response
    if (data.errors && data.errors.length > 0) {
      logger.error({ errors: data.errors }, 'Runware API returned errors');
      await releaseGeneration(reservation.id);
      return res.status(400).json({
        error: data.errors[0]?.message || 'Runware API error',
      });
    }

    // Runware returns { data: [...] } with imageURL in each result
    if (data.data && data.data.length > 0 && data.data[0].imageURL) {
      billed = true;
      const cdnUrl = data.data[0].imageURL;
      const imageUrl = await downloadAndSaveImage(req.householdId!, cdnUrl);
      return res.json({ imageUrl });
    }

    logger.error({ data }, 'Unexpected Runware response');
    await releaseGeneration(reservation.id);
    return res.status(500).json({ error: 'No image generated' });
  } catch (error) {
    // Give the slot back first, whatever the failure was — but only if nothing
    // was bought. A storage-quota rejection *after* Runware generated the image
    // still cost money, so that one stays counted.
    if (!billed) {
      await releaseGeneration(reservation.id).catch(() => {});
    }
    if (await handleQuotaError(error, res)) return;
    logger.error({ err: error }, 'Runware proxy error');
    return res.status(500).json({ error: 'Failed to generate image' });
  }
}, 'Failed to generate image'));

export default router;
