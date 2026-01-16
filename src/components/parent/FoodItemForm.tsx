import { useState, useEffect } from 'react';
import { Button } from '../common/Button';
import { usePollinationsImage } from '../../hooks/usePollinationsImage';
import { getPlaceholderImageUrl } from '../../utils/imageUtils';
import type { FoodCategory } from '../../types';

interface FoodItemFormProps {
  onSubmit: (name: string, category: FoodCategory, imageUrl: string | null) => void;
  onCancel: () => void;
  initialValues?: {
    name: string;
    category: FoodCategory;
    imageUrl: string | null;
  };
}

export function FoodItemForm({ onSubmit, onCancel, initialValues }: FoodItemFormProps) {
  const [name, setName] = useState(initialValues?.name || '');
  const [category, setCategory] = useState<FoodCategory>(initialValues?.category || 'main');
  const [useAiImage, setUseAiImage] = useState(!initialValues?.imageUrl);
  const [customImageUrl, setCustomImageUrl] = useState(initialValues?.imageUrl || '');

  const { imageUrl: aiImageUrl, isLoading, regenerate } = usePollinationsImage(
    useAiImage ? name : ''
  );

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (useAiImage && aiImageUrl) {
      setPreviewUrl(aiImageUrl);
    } else if (!useAiImage && customImageUrl) {
      setPreviewUrl(customImageUrl);
    } else {
      setPreviewUrl(null);
    }
  }, [useAiImage, aiImageUrl, customImageUrl]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const imageUrl = useAiImage ? aiImageUrl : customImageUrl || null;
    onSubmit(name.trim(), category, imageUrl);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name input */}
      <div>
        <label htmlFor="food-name" className="block text-sm font-medium text-gray-700 mb-1">
          Food Name
        </label>
        <input
          id="food-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Spaghetti, Broccoli"
          className="
            w-full px-4 py-2 rounded-lg border border-gray-300
            focus:outline-none focus:ring-2 focus:ring-parent-primary focus:border-transparent
          "
          required
        />
      </div>

      {/* Category select */}
      <div>
        <label htmlFor="food-category" className="block text-sm font-medium text-gray-700 mb-1">
          Category
        </label>
        <select
          id="food-category"
          value={category}
          onChange={(e) => setCategory(e.target.value as FoodCategory)}
          className="
            w-full px-4 py-2 rounded-lg border border-gray-300
            focus:outline-none focus:ring-2 focus:ring-parent-primary focus:border-transparent
          "
        >
          <option value="main">Main Dish</option>
          <option value="side">Side Dish</option>
        </select>
      </div>

      {/* Image options */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Image
        </label>
        <div className="flex gap-2 mb-3">
          <Button
            type="button"
            variant={useAiImage ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setUseAiImage(true)}
          >
            AI Generated
          </Button>
          <Button
            type="button"
            variant={!useAiImage ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setUseAiImage(false)}
          >
            Custom URL
          </Button>
        </div>

        {!useAiImage && (
          <input
            type="url"
            value={customImageUrl}
            onChange={(e) => setCustomImageUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="
              w-full px-4 py-2 rounded-lg border border-gray-300
              focus:outline-none focus:ring-2 focus:ring-parent-primary focus:border-transparent
            "
          />
        )}

        {/* Image preview */}
        <div className="mt-3 flex items-center gap-4">
          <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-parent-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <img
                src={previewUrl || getPlaceholderImageUrl()}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            )}
          </div>
          {useAiImage && name && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={regenerate}
              disabled={isLoading}
            >
              Regenerate
            </Button>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 pt-4">
        <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" variant="primary" className="flex-1" disabled={!name.trim()}>
          {initialValues ? 'Save' : 'Add Food'}
        </Button>
      </div>
    </form>
  );
}
