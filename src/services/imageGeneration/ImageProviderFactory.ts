import type { ImageProvider, ImageProviderService } from './types';
import { PollinationsProvider } from './providers/PollinationsProvider';
import { RunwareProvider } from './providers/RunwareProvider';

const providerCache = new Map<ImageProvider, ImageProviderService>();

export function createImageProvider(provider: ImageProvider): ImageProviderService {
  const cached = providerCache.get(provider);
  if (cached) {
    return cached;
  }

  let instance: ImageProviderService;
  switch (provider) {
    case 'runware':
      instance = new RunwareProvider();
      break;
    case 'pollinations':
    default:
      instance = new PollinationsProvider();
      break;
  }

  providerCache.set(provider, instance);
  return instance;
}
