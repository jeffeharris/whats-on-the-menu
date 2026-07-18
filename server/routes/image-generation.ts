import { Router } from 'express';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import { writeFileSync } from 'fs';
import { join } from 'path';
import {
  UPLOADS_DIR,
  MAX_DIMENSION,
  JPEG_QUALITY,
  registerUpload,
  assertWithinQuota,
  getStorageStats,
  QuotaExceededError,
} from './uploads.js';

const router = Router();

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

// GET /api/image-generation/pollinations - Generate Pollinations image URL
router.get('/pollinations', async (req, res) => {
  const { prompt, width = 400, height = 400, seed } = req.query;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const apiKey = process.env.POLLINATIONS_API_KEY;
  const encodedPrompt = encodeURIComponent(prompt);
  const keyParam = apiKey ? `&key=${apiKey}` : '';
  const seedParam = seed ? `&seed=${seed}` : '';

  const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true${keyParam}${seedParam}`;

  try {
    // Fail fast before the external fetch if already at/over quota.
    await assertWithinQuota(req.householdId!, 0);
    const imageUrl = await downloadAndSaveImage(req.householdId!, pollinationsUrl, 60000);
    return res.json({ imageUrl });
  } catch (error) {
    if (await handleQuotaError(error, res)) return;
    console.error('Pollinations download error:', error);
    return res.status(500).json({ error: 'Failed to generate and save image' });
  }
});

// POST /api/image-generation/runware - Proxy to Runware API
// Model tiers (escalated on regenerate):
//   runware:101@1 — FLUX Schnell (fast, cheap) — default
//   runware:400@4 — FLUX.2 klein 4B (good quality, still cheap)
//   runware:400@1 — FLUX.2 dev (highest quality, pricier)
router.post('/runware', async (req, res) => {
  const apiKey = process.env.RUNWARE_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Runware API key not configured' });
  }

  const { prompt, width = 512, height = 512, seed, model = 'runware:101@1' } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    // Fail fast before the external call if already at/over quota.
    await assertWithinQuota(req.householdId!, 0);

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
          model,
          numberResults: 1,
          ...(seed !== undefined && { seed }),
        },
      ]),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Runware API error:', response.status, errorData);
      return res.status(response.status).json({
        error: errorData.errors?.[0]?.message || `Runware API error: ${response.status}`,
      });
    }

    const data = await response.json();

    // Check for errors in response
    if (data.errors && data.errors.length > 0) {
      console.error('Runware API returned errors:', data.errors);
      return res.status(400).json({
        error: data.errors[0]?.message || 'Runware API error',
      });
    }

    // Runware returns { data: [...] } with imageURL in each result
    if (data.data && data.data.length > 0 && data.data[0].imageURL) {
      const cdnUrl = data.data[0].imageURL;
      const imageUrl = await downloadAndSaveImage(req.householdId!, cdnUrl);
      return res.json({ imageUrl });
    }

    console.error('Unexpected Runware response:', data);
    return res.status(500).json({ error: 'No image generated' });
  } catch (error) {
    if (await handleQuotaError(error, res)) return;
    console.error('Runware proxy error:', error);
    return res.status(500).json({ error: 'Failed to generate image' });
  }
});

export default router;
