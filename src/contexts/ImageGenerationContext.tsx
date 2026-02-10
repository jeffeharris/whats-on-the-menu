import { createContext, useContext, useCallback } from 'react';
import type { ReactNode } from 'react';
import { createImageProvider } from '../services/imageGeneration';
import type { ImageProviderService } from '../services/imageGeneration';

interface ImageGenerationContextType {
  getProviderService: () => ImageProviderService;
}

const ImageGenerationContext = createContext<ImageGenerationContextType | null>(null);

export function ImageGenerationProvider({ children }: { children: ReactNode }) {
  const getProviderService = useCallback((): ImageProviderService => {
    return createImageProvider('runware');
  }, []);

  return (
    <ImageGenerationContext.Provider value={{ getProviderService }}>
      {children}
    </ImageGenerationContext.Provider>
  );
}

export function useImageGenerationContext() {
  const context = useContext(ImageGenerationContext);
  if (!context) {
    throw new Error('useImageGenerationContext must be used within an ImageGenerationProvider');
  }
  return context;
}
