import { Router } from 'express';
import { randomUUID } from 'crypto';

const router = Router();

// Runware requires dimensions to be multiples of 64
function roundToMultipleOf64(value: number): number {
  return Math.round(value / 64) * 64;
}

// GET /api/image-generation/pollinations - Generate Pollinations image URL
router.get('/pollinations', (req, res) => {
  const { prompt, width = 400, height = 400, seed } = req.query;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const apiKey = process.env.POLLINATIONS_API_KEY;
  const encodedPrompt = encodeURIComponent(prompt);
  const keyParam = apiKey ? `&key=${apiKey}` : '';
  const seedParam = seed ? `&seed=${seed}` : '';

  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true${keyParam}${seedParam}`;

  return res.json({ imageUrl });
});

// POST /api/image-generation/runware - Proxy to Runware API
router.post('/runware', async (req, res) => {
  const apiKey = process.env.RUNWARE_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Runware API key not configured' });
  }

  const { prompt, width = 512, height = 512, seed } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt is required' });
  }

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
          model: 'runware:101@1', // FLUX Schnell - fast, good quality
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
      return res.json({ imageUrl: data.data[0].imageURL });
    }

    console.error('Unexpected Runware response:', data);
    return res.status(500).json({ error: 'No image generated' });
  } catch (error) {
    console.error('Runware proxy error:', error);
    return res.status(500).json({ error: 'Failed to generate image' });
  }
});

export default router;
