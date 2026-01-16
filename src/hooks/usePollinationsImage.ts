import { useState, useEffect, useRef } from 'react';
import { generateFoodImageUrl } from '../utils/imageUtils';

interface UsePollinationsImageReturn {
  imageUrl: string | null;
  isLoading: boolean;
  error: string | null;
  regenerate: () => void;
}

const MIN_CHARS = 3;
const DEBOUNCE_MS = 500;

export function usePollinationsImage(foodName: string): UsePollinationsImageReturn {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seed, setSeed] = useState(0);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    const trimmed = foodName.trim();

    // Clear any pending debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    // Not enough characters
    if (trimmed.length < MIN_CHARS) {
      setImageUrl(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Debounce the image generation
    debounceRef.current = window.setTimeout(() => {
      // Generate the URL with optional seed for regeneration
      const url = seed > 0
        ? `${generateFoodImageUrl(trimmed)}&seed=${seed}`
        : generateFoodImageUrl(trimmed);

      // Pre-load the image to detect errors
      const img = new Image();
      img.onload = () => {
        setImageUrl(url);
        setIsLoading(false);
      };
      img.onerror = () => {
        setError('Failed to generate image');
        setIsLoading(false);
      };
      img.src = url;
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [foodName, seed]);

  const regenerate = () => {
    setSeed((prev) => prev + 1);
  };

  return { imageUrl, isLoading, error, regenerate };
}
