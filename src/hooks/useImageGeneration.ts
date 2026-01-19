import { useState, useEffect, useRef, useCallback } from 'react';
import { useImageGenerationContext } from '../contexts/ImageGenerationContext';

interface UseImageGenerationReturn {
  imageUrl: string | null;
  isLoading: boolean;
  error: string | null;
  regenerate: () => void;
}

const MIN_CHARS = 3;
const DEBOUNCE_MS = 500;

function buildFoodPrompt(foodName: string): string {
  return `A friendly cartoon illustration of ${foodName}, simple, colorful, appetizing, white background, for children`;
}

export function useImageGeneration(foodName: string): UseImageGenerationReturn {
  const { getProviderService } = useImageGenerationContext();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seed, setSeed] = useState(0);
  const debounceRef = useRef<number | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    const trimmed = foodName.trim();

    // Clear any pending debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    // Mark previous request as cancelled
    cancelledRef.current = true;

    // Not enough characters
    if (trimmed.length < MIN_CHARS) {
      setImageUrl(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Debounce the image generation
    debounceRef.current = window.setTimeout(async () => {
      cancelledRef.current = false;
      const provider = getProviderService();
      const prompt = buildFoodPrompt(trimmed);
      const options = {
        prompt,
        width: 400,
        height: 400,
        ...(seed > 0 && { seed }),
      };

      try {
        // Both providers now return promises
        const url = await provider.generateImageUrl(options);

        if (cancelledRef.current) return;

        // Preload the image if provider supports it
        if (provider.supportsPreloading()) {
          const img = new Image();
          img.onload = () => {
            if (cancelledRef.current) return;
            setImageUrl(url);
            setIsLoading(false);
          };
          img.onerror = () => {
            if (cancelledRef.current) return;
            setError('Failed to load image');
            setIsLoading(false);
          };
          img.src = url;
        } else {
          setImageUrl(url);
          setIsLoading(false);
        }
      } catch (err) {
        if (cancelledRef.current) return;
        setError(err instanceof Error ? err.message : 'Failed to generate image');
        setIsLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      cancelledRef.current = true;
    };
  }, [foodName, seed, getProviderService]);

  const regenerate = useCallback(() => {
    setSeed((prev) => prev + 1);
  }, []);

  return { imageUrl, isLoading, error, regenerate };
}
