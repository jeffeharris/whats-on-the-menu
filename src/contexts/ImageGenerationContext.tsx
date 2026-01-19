import { createContext, useContext, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { STORAGE_KEYS } from '../utils/storage';
import { createImageProvider } from '../services/imageGeneration';
import type { ImageProvider, ImageProviderService } from '../services/imageGeneration';

interface ImageGenerationState {
  provider: ImageProvider;
}

const DEFAULT_STATE: ImageGenerationState = {
  provider: 'pollinations',
};

interface ImageGenerationContextType extends ImageGenerationState {
  setProvider: (provider: ImageProvider) => void;
  getProviderService: () => ImageProviderService;
}

const ImageGenerationContext = createContext<ImageGenerationContextType | null>(null);

export function ImageGenerationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useLocalStorage<ImageGenerationState>(
    STORAGE_KEYS.IMAGE_GENERATION,
    DEFAULT_STATE
  );

  const setProvider = useCallback((provider: ImageProvider) => {
    setState((prev) => ({
      ...prev,
      provider,
    }));
  }, [setState]);

  const getProviderService = useCallback((): ImageProviderService => {
    return createImageProvider(state.provider);
  }, [state.provider]);

  return (
    <ImageGenerationContext.Provider
      value={{
        ...state,
        setProvider,
        getProviderService,
      }}
    >
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
