import { useState, useEffect, useRef, useCallback } from 'react';
import { useImageGenerationContext } from '../contexts/ImageGenerationContext';

interface UseImageGenerationReturn {
  imageUrl: string | null;
  isLoading: boolean;
  error: string | null;
  regenerate: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  prevImage: () => void;
  nextImage: () => void;
  historyPosition: number;
  historyLength: number;
}

const MIN_CHARS = 3;
const DEBOUNCE_MS = 500;

// The model lives on the server (Z-Image Turbo — fast, high quality, cheap
// enough that regenerating no longer needs to escalate to a pricier tier).
// Regenerating just varies the seed.

function buildFoodPrompt(foodName: string): string {
  return `A friendly cartoon illustration of ${foodName}, simple, colorful, appetizing, white background, for children`;
}

export function useImageGeneration(foodName: string): UseImageGenerationReturn {
  const { getProviderService } = useImageGenerationContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seed, setSeed] = useState(0);
  const [imageHistory, setImageHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const debounceRef = useRef<number | null>(null);
  const cancelledRef = useRef(false);
  const [prevFoodName, setPrevFoodName] = useState(foodName);

  // Reset history when food name changes.
  // Adjusting state during render (not in an effect) is the recommended
  // pattern for resetting state on a prop change — React re-renders
  // immediately without committing the intermediate UI.
  if (foodName !== prevFoodName) {
    setPrevFoodName(foodName);
    setImageHistory([]);
    setHistoryIndex(-1);
    setSeed(0);
  }

  useEffect(() => {
    const trimmed = foodName.trim();

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    cancelledRef.current = true;

    if (trimmed.length < MIN_CHARS) {
      return;
    }

    debounceRef.current = window.setTimeout(async () => {
      cancelledRef.current = false;
      setIsLoading(true);
      setError(null);
      const provider = getProviderService();
      const prompt = buildFoodPrompt(trimmed);
      const options = {
        prompt,
        width: 400,
        height: 400,
        ...(seed > 0 && { seed }),
      };

      try {
        const url = await provider.generateImageUrl(options);

        if (cancelledRef.current) return;

        if (provider.supportsPreloading()) {
          const img = new Image();
          img.onload = () => {
            if (cancelledRef.current) return;
            setImageHistory((prev) => [...prev, url]);
            setHistoryIndex((prev) => prev + 1);
            setIsLoading(false);
          };
          img.onerror = () => {
            if (cancelledRef.current) return;
            setError('Failed to load image');
            setIsLoading(false);
          };
          img.src = url;
        } else {
          setImageHistory((prev) => [...prev, url]);
          setHistoryIndex((prev) => prev + 1);
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
      // Clear loading on teardown/abort (e.g. input shortened mid-generation)
      // so an in-flight request that never resolves can't leave a stuck spinner.
      setIsLoading(false);
    };
  }, [foodName, seed, getProviderService]);

  const regenerate = useCallback(() => {
    setSeed((prev) => prev + 1);
  }, []);

  const prevImage = useCallback(() => {
    setHistoryIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const nextImage = useCallback(() => {
    setHistoryIndex((prev) => Math.min(imageHistory.length - 1, prev + 1));
  }, [imageHistory.length]);

  const imageUrl = historyIndex >= 0 && historyIndex < imageHistory.length
    ? imageHistory[historyIndex]
    : null;

  return {
    imageUrl,
    isLoading,
    error,
    regenerate,
    hasPrev: historyIndex > 0,
    hasNext: historyIndex < imageHistory.length - 1,
    prevImage,
    nextImage,
    historyPosition: historyIndex + 1,
    historyLength: imageHistory.length,
  };
}
