import type { ImageProvider, ImageProviderService } from './types';
import { RunwareProvider } from './providers/RunwareProvider';

const providerCache = new Map<ImageProvider, ImageProviderService>();

export function createImageProvider(provider: ImageProvider): ImageProviderService {
  const cached = providerCache.get(provider);
  if (cached) {
    return cached;
  }

  const instance = new RunwareProvider();
  providerCache.set(provider, instance);
  return instance;
}
