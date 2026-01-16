import { useState } from 'react';
import { useFoodLibrary } from '../../contexts/FoodLibraryContext';
import { getPlaceholderImageUrl } from '../../utils/imageUtils';
import type { KidSelection } from '../../types';

interface SelectionThumbnailsProps {
  selection: KidSelection;
}

function Thumbnail({ imageUrl, name }: { imageUrl: string | null; name: string }) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
      <img
        src={imageError || !imageUrl ? getPlaceholderImageUrl() : imageUrl}
        alt={name}
        className="w-full h-full object-cover"
        onError={() => setImageError(true)}
      />
    </div>
  );
}

export function SelectionThumbnails({ selection }: SelectionThumbnailsProps) {
  const { getItem } = useFoodLibrary();

  const mainItem = selection.mainId ? getItem(selection.mainId) : null;
  const sideItems = selection.sideIds.map((id) => getItem(id)).filter(Boolean);

  const allItems = [mainItem, ...sideItems].filter(Boolean);

  if (allItems.length === 0) {
    return null;
  }

  return (
    <div className="flex justify-center gap-1 mt-1">
      {allItems.map((item) => item && (
        <Thumbnail key={item.id} imageUrl={item.imageUrl} name={item.name} />
      ))}
    </div>
  );
}
