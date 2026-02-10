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

// Model escalation: generation count → model ID
const MODEL_SEQUENCE = [
  'runware:101@1', // Generations 1-2: FLUX Schnell (fast, cheap)
  'runware:101@1',
  'runware:400@4', // Generation 3: FLUX.2 klein 4B (good quality, still cheap)
  'runware:400@1', // Generation 4+: FLUX.2 dev (highest quality)
];

function getModelForGeneration(generationCount: number): string {
  const index = Math.min(generationCount, MODEL_SEQUENCE.length - 1);
  return MODEL_SEQUENCE[index];
}

function buildFoodPrompt(foodName: string): string {
  return `A friendly cartoon illustration of ${foodName}, simple, colorful, appetizing, white background, for children`;
}

export function useImageGeneration(foodName: string): UseImageGenerationReturn {
  const { getProviderService } = useImageGenerationContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seed, setSeed] = useState(0);
  const [generationCount, setGenerationCount] = useState(0);
  const [imageHistory, setImageHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const debounceRef = useRef<number | null>(null);
  const cancelledRef = useRef(false);
  const prevFoodNameRef = useRef(foodName);

  // Reset history when food name changes
  useEffect(() => {
    if (foodName !== prevFoodNameRef.current) {
      prevFoodNameRef.current = foodName;
      setImageHistory([]);
      setHistoryIndex(-1);
      setGenerationCount(0);
      setSeed(0);
    }
  }, [foodName]);

  useEffect(() => {
    const trimmed = foodName.trim();

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    cancelledRef.current = true;

    if (trimmed.length < MIN_CHARS) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    debounceRef.current = window.setTimeout(async () => {
      cancelledRef.current = false;
      const provider = getProviderService();
      const prompt = buildFoodPrompt(trimmed);
      const model = getModelForGeneration(generationCount);
      const options = {
        prompt,
        width: 400,
        height: 400,
        model,
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
    };
  }, [foodName, seed, generationCount, getProviderService]);

  const regenerate = useCallback(() => {
    setGenerationCount((prev) => prev + 1);
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
