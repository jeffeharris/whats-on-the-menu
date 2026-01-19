export type ImageProvider = 'pollinations' | 'runware';

export interface ImageGenerationOptions {
  prompt: string;
  width?: number;
  height?: number;
  seed?: number;
}

export interface ImageProviderService {
  generateImageUrl(options: ImageGenerationOptions): Promise<string> | string;
  supportsPreloading(): boolean;
}
