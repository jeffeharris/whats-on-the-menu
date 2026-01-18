import { Button } from '../../components/common/Button';
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
    <div className="h-full bg-kid-bg flex flex-col p-4 md:p-8 overflow-hidden">
      <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="text-center mb-6 md:mb-8">
          <KidAvatar name={kid.name} color={kid.avatarColor} size="lg" />
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mt-4">
            {kid.name}'s Plate
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mt-2">
            Yummy choices!
          </p>
        </div>

        {/* Selected items by group */}
        <div className="flex-1">
          {groupedItems.map((group, idx) => (
            <div key={idx} className="mb-6">
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

        {/* Actions */}
        <div className="flex flex-col gap-3 max-w-md mx-auto w-full">
        <Button
          mode="kid"
          variant="primary"
          size="touch"
          fullWidth
          onClick={onDone}
        >
          All Done!
        </Button>
        {!selectionsLocked && (
          <Button
            mode="kid"
            variant="ghost"
            size="lg"
            fullWidth
            onClick={onEdit}
          >
            Change my mind
          </Button>
        )}
        {selectionsLocked && (
          <p className="text-center text-gray-500 text-lg">
            Selections are locked!
          </p>
        )}
        </div>
      </div>
    </div>
  );
}
