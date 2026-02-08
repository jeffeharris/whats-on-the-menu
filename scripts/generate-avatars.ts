import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { randomUUID } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const OUTPUT_DIR = join(PROJECT_ROOT, 'public', 'avatars');

const ANIMALS = ['cat', 'dog', 'bear', 'bunny', 'penguin', 'owl', 'fox', 'panda', 'lion', 'elephant', 'frog'] as const;

function getPrompt(animal: string): string {
  return `cute cartoon ${animal} face, simple, friendly, chibi style, front-facing, solid bright green #00FF00 background, green screen`;
}

// Runware requires dimensions to be multiples of 64
const IMAGE_SIZE = 512;

async function generateImage(apiKey: string, animal: string): Promise<Buffer> {
  const taskUUID = randomUUID();

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
        positivePrompt: getPrompt(animal),
        width: IMAGE_SIZE,
        height: IMAGE_SIZE,
        model: 'runware:101@1', // FLUX Schnell
        numberResults: 1,
      },
    ]),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Runware API error ${response.status}: ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();

  if (data.errors && data.errors.length > 0) {
    throw new Error(`Runware error: ${data.errors[0]?.message}`);
  }

  if (!data.data?.[0]?.imageURL) {
    throw new Error('No image URL in response');
  }

  const imageUrl = data.data[0].imageURL;
  console.log(`  Downloaded from: ${imageUrl}`);

  const imgResponse = await fetch(imageUrl);
  if (!imgResponse.ok) {
    throw new Error(`Failed to download image: ${imgResponse.status}`);
  }

  const arrayBuffer = await imgResponse.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function removeGreenScreen(inputBuffer: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(inputBuffer)
    .resize(IMAGE_SIZE, IMAGE_SIZE)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const pixels = new Uint8Array(data);

  // Iterate pixels and make green-screen pixels transparent
  for (let i = 0; i < width * height * channels; i += channels) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];

    // Green screen: green channel dominant over red and blue
    // FLUX generates impure greens (~R100 G225 B40), so use ratio-based detection
    if (g > 150 && g > r * 1.4 && g > b * 1.4) {
      pixels[i + 3] = 0; // Set alpha to 0 (transparent)
    }
  }

  return sharp(Buffer.from(pixels), {
    raw: { width, height, channels },
  })
    .png()
    .toBuffer();
}

async function main() {
  const apiKey = process.env.RUNWARE_API_KEY;
  if (!apiKey) {
    console.error('Error: RUNWARE_API_KEY environment variable is required.');
    console.error('Set it in your .env file or pass it directly:');
    console.error('  RUNWARE_API_KEY=your_key npm run generate-avatars');
    process.exit(1);
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`Generating ${ANIMALS.length} animal avatars...\n`);

  for (const animal of ANIMALS) {
    console.log(`Generating ${animal}...`);
    try {
      const rawImage = await generateImage(apiKey, animal);
      const pngWithTransparency = await removeGreenScreen(rawImage);
      const outputPath = join(OUTPUT_DIR, `${animal}.png`);
      writeFileSync(outputPath, pngWithTransparency);
      console.log(`  Saved: ${outputPath}\n`);
    } catch (error) {
      console.error(`  Failed to generate ${animal}:`, error);
      process.exit(1);
    }
  }

  console.log('All avatars generated successfully!');
}

main();
