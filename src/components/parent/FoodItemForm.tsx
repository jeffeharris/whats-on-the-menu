import { useState, useEffect, useRef } from 'react';
import { Button } from '../common/Button';
import { usePollinationsImage } from '../../hooks/usePollinationsImage';
import { getPlaceholderImageUrl } from '../../utils/imageUtils';
import { useFoodLibrary } from '../../contexts/FoodLibraryContext';
import { uploadsApi } from '../../api/client';
import type { FoodCategory } from '../../types';

type ImageSource = 'ai' | 'url' | 'upload';

interface FoodItemFormProps {
  onSubmit: (name: string, category: FoodCategory, imageUrl: string | null) => void;
  onCancel: () => void;
  initialValues?: {
    name: string;
    category: FoodCategory;
    imageUrl: string | null;
  };
}

// Determine initial image source based on existing imageUrl
function getInitialImageSource(imageUrl: string | null): ImageSource {
  if (!imageUrl) return 'ai';
  if (imageUrl.startsWith('/uploads/')) return 'upload';
  return 'url';
}

export function FoodItemForm({ onSubmit, onCancel, initialValues }: FoodItemFormProps) {
  const [name, setName] = useState(initialValues?.name || '');
  const [category, setCategory] = useState<FoodCategory>(initialValues?.category || 'main');
  const [imageSource, setImageSource] = useState<ImageSource>(
    getInitialImageSource(initialValues?.imageUrl ?? null)
  );
  const [customImageUrl, setCustomImageUrl] = useState(
    initialValues?.imageUrl && !initialValues.imageUrl.startsWith('/uploads/')
      ? initialValues.imageUrl
      : ''
  );
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(
    initialValues?.imageUrl?.startsWith('/uploads/') ? initialValues.imageUrl : null
  );
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
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

  const { storageStats, refreshStorageStats } = useFoodLibrary();

  const { imageUrl: aiImageUrl, isLoading, regenerate } = usePollinationsImage(
    imageSource === 'ai' ? name : ''
  );

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (imageSource === 'ai' && aiImageUrl) {
      setPreviewUrl(aiImageUrl);
    } else if (imageSource === 'url' && customImageUrl) {
      setPreviewUrl(customImageUrl);
    } else if (imageSource === 'upload' && pendingPreviewUrl) {
      setPreviewUrl(pendingPreviewUrl);
    } else if (imageSource === 'upload' && uploadedImageUrl) {
      setPreviewUrl(uploadedImageUrl);
    } else {
      setPreviewUrl(null);
    }
  }, [imageSource, aiImageUrl, customImageUrl, uploadedImageUrl, pendingPreviewUrl]);

  // Clean up object URL when component unmounts or file changes
  useEffect(() => {
    return () => {
      if (pendingPreviewUrl) {
        URL.revokeObjectURL(pendingPreviewUrl);
      }
    };
  }, [pendingPreviewUrl]);

  // Rotate image using canvas
  const rotateImage = (file: File, degrees: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Swap dimensions for 90/270 degree rotations
        if (degrees === 90 || degrees === 270) {
          canvas.width = img.height;
          canvas.height = img.width;
        } else {
          canvas.width = img.width;
          canvas.height = img.height;
        }

        // Move to center, rotate, then draw
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((degrees * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Could not create blob'));
            }
          },
          'image/jpeg',
          0.9
        );
      };
      img.onerror = () => reject(new Error('Could not load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setRotation(0);

    // Revoke previous preview URL if exists
    if (pendingPreviewUrl) {
      URL.revokeObjectURL(pendingPreviewUrl);
    }

    // Create local preview
    const previewUrl = URL.createObjectURL(file);
    setPendingFile(file);
    setPendingPreviewUrl(previewUrl);
    setUploadedImageUrl(null);

    // Clear inputs so the same file can be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (!pendingFile) return;

    setUploadError(null);
    setIsUploading(true);

    try {
      let fileToUpload: File | Blob = pendingFile;

      // Apply rotation if needed
      if (rotation !== 0) {
        fileToUpload = await rotateImage(pendingFile, rotation);
      }

      const result = await uploadsApi.upload(fileToUpload as File);
      setUploadedImageUrl(result.imageUrl);

      // Clear pending state
      if (pendingPreviewUrl) {
        URL.revokeObjectURL(pendingPreviewUrl);
      }
      setPendingFile(null);
      setPendingPreviewUrl(null);
      setRotation(0);

      refreshStorageStats();
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const clearPendingFile = () => {
    if (pendingPreviewUrl) {
      URL.revokeObjectURL(pendingPreviewUrl);
    }
    setPendingFile(null);
    setPendingPreviewUrl(null);
    setRotation(0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let imageUrl: string | null = null;
    if (imageSource === 'ai') {
      imageUrl = aiImageUrl;
    } else if (imageSource === 'url') {
      imageUrl = customImageUrl || null;
    } else if (imageSource === 'upload') {
      imageUrl = uploadedImageUrl;
    }
    onSubmit(name.trim(), category, imageUrl);
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
        <div className="flex gap-2 mb-3 flex-wrap">
          <Button
            type="button"
            variant={imageSource === 'ai' ? 'primary' : 'ghost'}
            size="md"
            onClick={() => setImageSource('ai')}
          >
            AI Generated
          </Button>
          <Button
            type="button"
            variant={imageSource === 'url' ? 'primary' : 'ghost'}
            size="md"
            onClick={() => setImageSource('url')}
          >
            Custom URL
          </Button>
          <Button
            type="button"
            variant={imageSource === 'upload' ? 'primary' : 'ghost'}
            size="md"
            onClick={() => setImageSource('upload')}
          >
            Upload Photo
          </Button>
        </div>

        {imageSource === 'url' && (
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

        {imageSource === 'upload' && (
          <div className="space-y-3">
            {/* Storage indicator */}
            {storageStats && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Storage: {storageStats.usedMB} / {storageStats.limitMB} MB</span>
                  <span>{storageStats.percentage.toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      isStorageFull ? 'bg-red-500' : isStorageWarning ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(storageStats.percentage, 100)}%` }}
                  />
                </div>
                {isStorageFull && (
                  <p className="text-xs text-red-600">
                    Storage full. Delete some images to upload more.
                  </p>
                )}
                {isStorageWarning && !isStorageFull && (
                  <p className="text-xs text-yellow-600">
                    Storage almost full ({storageStats.percentage.toFixed(1)}% used).
                  </p>
                )}
              </div>
            )}

            {/* File inputs */}
            <div className="flex gap-2 flex-wrap">
              {/* Camera input - uses device camera on mobile */}
              {isMobileDevice && (
                <>
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileSelect}
                    disabled={isUploading || isStorageFull || pendingFile !== null}
                    className="hidden"
                    id="camera-capture"
                  />
                  <label
                    htmlFor="camera-capture"
                    className={`
                      inline-flex items-center px-4 py-3 rounded-lg border-2 border-dashed cursor-pointer
                      transition-colors min-h-[44px]
                      ${isStorageFull || isUploading || pendingFile
                        ? 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'border-gray-300 hover:border-parent-primary text-gray-600 hover:text-parent-primary'
                      }
                    `}
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Take Photo
                  </label>
                </>
              )}

              {/* File picker input - opens photo library */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileSelect}
                disabled={isUploading || isStorageFull || pendingFile !== null}
                className="hidden"
                id="photo-upload"
              />
              <label
                htmlFor="photo-upload"
                className={`
                  inline-flex items-center px-4 py-3 rounded-lg border-2 border-dashed cursor-pointer
                  transition-colors min-h-[44px]
                  ${isStorageFull || isUploading || pendingFile
                    ? 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'border-gray-300 hover:border-parent-primary text-gray-600 hover:text-parent-primary'
                  }
                `}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Choose Photo
              </label>
            </div>

            {uploadError && (
              <p className="text-sm text-red-600">{uploadError}</p>
            )}
          </div>
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
                className="w-full h-full object-cover transition-transform"
                style={{ transform: pendingFile ? `rotate(${rotation}deg)` : undefined }}
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
            {/* Rotation and upload controls for pending file */}
            {imageSource === 'upload' && pendingFile && (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2 items-center">
                  <button
                    type="button"
                    onClick={handleRotate}
                    disabled={isUploading}
                    className="p-3 min-w-[44px] min-h-[44px] rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 flex items-center justify-center"
                    title="Rotate"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={handleUpload}
                    disabled={isUploading}
                  >
                    {isUploading ? 'Uploading...' : 'Upload'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="md"
                    onClick={clearPendingFile}
                    disabled={isUploading}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            {/* Show uploaded status */}
            {imageSource === 'upload' && uploadedImageUrl && !pendingFile && (
              <span className="text-xs text-green-600">Uploaded</span>
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
          disabled={!name.trim() || (imageSource === 'upload' && pendingFile !== null)}
        >
          {initialValues ? 'Save' : 'Add Food'}
        </Button>
      </div>
      {imageSource === 'upload' && pendingFile && (
        <p className="text-xs text-amber-600 text-center">
          Please upload the photo before saving
        </p>
      )}
    </form>
  );
}
