import type { ImageGenerationOptions, ImageProviderService } from '../types';

export class RunwareProvider implements ImageProviderService {
  async generateImageUrl(options: ImageGenerationOptions): Promise<string> {
    const { prompt, width = 400, height = 400, seed, model } = options;

    const response = await fetch('/api/image-generation/runware', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, width, height, seed, ...(model && { model }) }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || 'Failed to generate image');
    }

    const data = await response.json();
    return data.imageUrl;
  }

  supportsPreloading(): boolean {
    return true;
  }
}
