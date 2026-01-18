import { useState, useEffect, useRef } from 'react';
import { Button } from '../common/Button';
import { TagInput } from './TagInput';
import { usePollinationsImage } from '../../hooks/usePollinationsImage';
import { getPlaceholderImageUrl } from '../../utils/imageUtils';
import { useFoodLibrary } from '../../contexts/FoodLibraryContext';
import { uploadsApi } from '../../api/client';

type ImageSource = 'ai' | 'upload';

interface FoodItemFormProps {
  onSubmit: (name: string, tags: string[], imageUrl: string | null) => void;
  onCancel: () => void;
  initialValues?: {
    name: string;
    tags: string[];
    imageUrl: string | null;
  };
}

// Determine initial image source based on existing imageUrl
function getInitialImageSource(imageUrl: string | null): ImageSource {
  if (!imageUrl) return 'upload';
  if (imageUrl.startsWith('/uploads/')) return 'upload';
  return 'ai';
}

export function FoodItemForm({ onSubmit, onCancel, initialValues }: FoodItemFormProps) {
  const [name, setName] = useState(initialValues?.name || '');
  const [tags, setTags] = useState<string[]>(initialValues?.tags || []);
  const [imageSource, setImageSource] = useState<ImageSource>(
    getInitialImageSource(initialValues?.imageUrl ?? null)
  );
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(
    initialValues?.imageUrl?.startsWith('/uploads/') ? initialValues.imageUrl : null
  );
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Detect if device likely has a camera (mobile/tablet)
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  useEffect(() => {
    // Check for touch capability and coarse pointer (touchscreen)
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
    setIsMobileDevice(hasTouch && hasCoarsePointer);
  }, []);

  const { storageStats, refreshStorageStats, allTags } = useFoodLibrary();

  const { imageUrl: aiImageUrl, isLoading, regenerate } = usePollinationsImage(
    imageSource === 'ai' ? name : ''
  );

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (imageSource === 'ai' && aiImageUrl) {
      setPreviewUrl(aiImageUrl);
    } else if (imageSource === 'upload' && uploadedImageUrl) {
      setPreviewUrl(uploadedImageUrl);
    } else {
      setPreviewUrl(null);
    }
  }, [imageSource, aiImageUrl, uploadedImageUrl]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageSource('upload');
    setUploadError(null);
    setUploadedImageUrl(null);

    // Clear inputs so the same file can be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
    }

    // Auto-upload the file
    setIsUploading(true);
    try {
      const result = await uploadsApi.upload(file);
      setUploadedImageUrl(result.imageUrl);
      await refreshStorageStats();
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let imageUrl: string | null = null;
    if (imageSource === 'ai') {
      imageUrl = aiImageUrl;
    } else if (imageSource === 'upload') {
      imageUrl = uploadedImageUrl;
    }
    onSubmit(name.trim(), tags, imageUrl);
  };

  const isStorageFull = storageStats ? storageStats.percentage >= 100 : false;
  const isStorageWarning = storageStats ? storageStats.warning : false;

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

      {/* Tags input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tags
        </label>
        <TagInput
          selectedTags={tags}
          availableTags={allTags}
          onChange={setTags}
          placeholder="Add tags (e.g., Protein, Veggie)"
        />
      </div>

      {/* Image options */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Image
        </label>

        {/* Storage warning only when nearly full */}
        {storageStats && (isStorageFull || isStorageWarning) && (
          <div className="space-y-1 mb-3">
            <div className="flex justify-between text-xs text-gray-600">
              <span>Storage: {storageStats.usedMB} / {storageStats.limitMB} MB</span>
              <span>{storageStats.percentage.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${isStorageFull ? 'bg-red-500' : 'bg-yellow-500'}`}
                style={{ width: `${Math.min(storageStats.percentage, 100)}%` }}
              />
            </div>
            {isStorageFull && (
              <p className="text-xs text-red-600">Storage full. Delete some images to upload more.</p>
            )}
          </div>
        )}

        {/* Hidden file inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          disabled={isUploading || isStorageFull}
          className="hidden"
          id="camera-capture"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          disabled={isUploading || isStorageFull}
          className="hidden"
          id="photo-upload"
        />

        {/* Two primary options: Take Photo / Generate AI */}
        <div className="flex gap-2">
          {/* Take Photo - primary on mobile */}
          {isMobileDevice ? (
            <label
              htmlFor="camera-capture"
              className={`
                flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg cursor-pointer
                transition-colors min-h-[48px] font-medium
                ${isStorageFull || isUploading
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : imageSource === 'upload' && uploadedImageUrl
                    ? 'bg-parent-primary text-white'
                    : 'bg-parent-primary text-white hover:bg-parent-primary/90'
                }
              `}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {isUploading ? 'Uploading...' : 'Take Photo'}
            </label>
          ) : (
            <label
              htmlFor="photo-upload"
              className={`
                flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg cursor-pointer
                transition-colors min-h-[48px] font-medium
                ${isStorageFull || isUploading
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-parent-primary text-white hover:bg-parent-primary/90'
                }
              `}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {isUploading ? 'Uploading...' : 'Choose Photo'}
            </label>
          )}

          {/* Generate AI Image */}
          <button
            type="button"
            onClick={() => setImageSource('ai')}
            disabled={!name.trim()}
            className={`
              flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg
              transition-colors min-h-[48px] font-medium border-2
              ${!name.trim()
                ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                : imageSource === 'ai'
                  ? 'border-parent-primary bg-parent-primary text-white'
                  : 'border-parent-primary text-parent-primary hover:bg-parent-primary/10'
              }
            `}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Generate AI
          </button>
        </div>

        {/* Secondary: Choose from Library (mobile only, since desktop uses it as primary) */}
        {isMobileDevice && (
          <label
            htmlFor="photo-upload"
            className={`
              w-full flex items-center justify-center gap-2 px-3 py-2 mt-2 rounded-lg cursor-pointer
              transition-colors text-sm
              ${isStorageFull || isUploading
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-600 hover:text-parent-primary'
              }
            `}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Or choose from library
          </label>
        )}

        {uploadError && (
          <p className="text-sm text-red-600 mt-2">{uploadError}</p>
        )}

        {/* Image preview */}
        <div className="mt-3 flex items-center gap-4">
          <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
            {isLoading || isUploading ? (
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
          <div className="flex flex-col gap-2">
            {imageSource === 'ai' && name && (
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
            {imageSource === 'upload' && uploadedImageUrl && (
              <span className="text-xs text-green-600">Photo uploaded</span>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 pt-4">
        <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          className="flex-1"
          disabled={!name.trim() || isUploading}
        >
          {initialValues ? 'Save' : 'Add Food'}
        </Button>
      </div>
    </form>
  );
}
