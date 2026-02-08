import { X, Check } from 'lucide-react';
import { FoodCard } from '../../components/kid/FoodCard';
import { KidAvatar } from '../../components/kid/KidAvatar';
import { useFoodLibrary } from '../../contexts/FoodLibraryContext';
import { useKidProfiles } from '../../contexts/KidProfilesContext';
import { useMenu } from '../../contexts/MenuContext';

interface PlateConfirmationProps {
  kidId: string;
  onDone: () => void;
  onEdit: () => void;
}

export function PlateConfirmation({ kidId, onDone, onEdit }: PlateConfirmationProps) {
  const { getItem } = useFoodLibrary();
  const { getProfile } = useKidProfiles();
  const { currentMenu, getSelectionForKid, selectionsLocked } = useMenu();

  const kid = getProfile(kidId);
  const selection = getSelectionForKid(kidId);

  if (!kid || !selection || !currentMenu) {
    return null;
  }

  // Get items from the new selections structure, grouped by menu groups
  const groupedItems: { label: string; items: ReturnType<typeof getItem>[] }[] = [];

  if (selection.selections) {
    // New structure
    currentMenu.groups
      .sort((a, b) => a.order - b.order)
      .forEach((group) => {
        const selectedIds = selection.selections[group.id] || [];
        const items = selectedIds.map((id) => getItem(id)).filter(Boolean);
        if (items.length > 0) {
          groupedItems.push({ label: group.label, items });
        }
      });
  } else {
    // Legacy structure: mainId and sideIds
    if (selection.mainId) {
      const mainItem = getItem(selection.mainId);
      if (mainItem) {
        groupedItems.push({ label: 'Main', items: [mainItem] });
      }
    }
    if (selection.sideIds && selection.sideIds.length > 0) {
      const sideItems = selection.sideIds.map((id) => getItem(id)).filter(Boolean);
      if (sideItems.length > 0) {
        groupedItems.push({ label: 'Sides', items: sideItems });
      }
    }
  }

  return (
    <div className="h-full bg-kid-bg flex flex-col overflow-hidden">
      {/* Header - fixed at top */}
      <header className="flex-shrink-0 flex items-center gap-3 px-4 pt-4 pb-2 max-w-2xl mx-auto w-full">
        <KidAvatar name={kid.name} color={kid.avatarColor} avatarAnimal={kid.avatarAnimal} size="md" />
        <div>
          <h1 className="text-xl font-bold text-gray-800 font-heading">
            {kid.name}'s Plate
          </h1>
          <p className="text-gray-500 text-sm">
            Yummy choices!
          </p>
        </div>
      </header>

      {/* Scrollable content */}
      <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col overflow-y-auto px-4 md:px-8">
        {/* Selected items by group */}
        <div className="flex-1 pt-2">
          {groupedItems.map((group, idx) => (
            <div key={idx} className="mb-4">
              <h2 className="text-xl font-semibold text-gray-700 mb-3 text-center">
                {group.label}
              </h2>
              <div className="flex justify-center gap-4 md:gap-6 flex-wrap">
                {group.items.map((item) => item && (
                  <FoodCard
                    key={item.id}
                    name={item.name}
                    imageUrl={item.imageUrl}
                    selected
                    size={group.items.length === 1 ? 'lg' : 'md'}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Actions - fixed footer */}
      <footer className="flex-shrink-0 border-t border-kid-primary/10 bg-kid-bg px-4 py-3">
        <div className="flex justify-center items-center gap-6 max-w-md mx-auto">
          {!selectionsLocked && (
            <button
              onClick={onEdit}
              className="w-16 h-16 rounded-full bg-white shadow-lg ring-2 ring-danger/30 flex items-center justify-center touch-feedback hover:scale-110 transition-transform"
              aria-label="Change my mind"
            >
              <X className="w-8 h-8 text-danger" strokeWidth={3} />
            </button>
          )}
          <button
            onClick={onDone}
            className="w-20 h-20 rounded-full bg-kid-secondary shadow-xl ring-4 ring-kid-secondary/30 flex items-center justify-center touch-feedback hover:scale-110 transition-transform"
            aria-label="All Done"
          >
            <Check className="w-10 h-10 text-white" strokeWidth={3} />
          </button>
          {selectionsLocked && (
            <p className="text-center text-gray-500 text-sm">
              Selections are locked
            </p>
          )}
        </div>
      </footer>
    </div>
  );
}
