import type { ImageGenerationOptions, ImageProviderService } from '../types';

export class PollinationsProvider implements ImageProviderService {
  async generateImageUrl(options: ImageGenerationOptions): Promise<string> {
    const { prompt, width = 400, height = 400, seed } = options;

    const params = new URLSearchParams({
      prompt,
      width: String(width),
      height: String(height),
    });

    if (seed !== undefined) {
      params.set('seed', String(seed));
    }

    const response = await fetch(`/api/image-generation/pollinations?${params}`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || 'Failed to generate image URL');
    }

    const data = await response.json();
    return data.imageUrl;
  }

  supportsPreloading(): boolean {
    return true;
  }
}
