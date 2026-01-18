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

  // Get all selected food IDs from the new selections structure
  const allFoodIds: string[] = [];

  if (selection.selections) {
    // New structure: selections is a GroupSelections object
    Object.values(selection.selections).forEach((ids) => {
      allFoodIds.push(...ids);
    });
  } else {
    // Legacy structure: mainId and sideIds
    if (selection.mainId) {
      allFoodIds.push(selection.mainId);
    }
    if (selection.sideIds) {
      allFoodIds.push(...selection.sideIds);
    }
  }

  const allItems = allFoodIds.map((id) => getItem(id)).filter(Boolean);

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
