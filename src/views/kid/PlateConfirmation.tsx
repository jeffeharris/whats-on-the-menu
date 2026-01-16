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
  const { getSelectionForKid } = useMenu();

  const kid = getProfile(kidId);
  const selection = getSelectionForKid(kidId);

  if (!kid || !selection) {
    return null;
  }

  const mainItem = selection.mainId ? getItem(selection.mainId) : null;
  const sideItems = selection.sideIds.map((id) => getItem(id)).filter(Boolean);

  return (
    <div className="min-h-screen bg-kid-bg flex flex-col p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <KidAvatar name={kid.name} color={kid.avatarColor} size="lg" />
        <h1 className="text-3xl font-bold text-gray-800 mt-4">
          {kid.name}'s Plate
        </h1>
        <p className="text-xl text-gray-600 mt-2">
          Yummy choices!
        </p>
      </div>

      {/* Selected items */}
      <div className="flex-1">
        {/* Main */}
        {mainItem && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-3 text-center">
              Main
            </h2>
            <div className="flex justify-center">
              <FoodCard
                name={mainItem.name}
                imageUrl={mainItem.imageUrl}
                selected
                size="lg"
              />
            </div>
          </div>
        )}

        {/* Sides */}
        {sideItems.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-3 text-center">
              Sides
            </h2>
            <div className="flex justify-center gap-4 flex-wrap">
              {sideItems.map((item) => item && (
                <FoodCard
                  key={item.id}
                  name={item.name}
                  imageUrl={item.imageUrl}
                  selected
                  size="md"
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <Button
          mode="kid"
          variant="primary"
          size="touch"
          fullWidth
          onClick={onDone}
        >
          All Done!
        </Button>
        <Button
          mode="kid"
          variant="ghost"
          size="lg"
          fullWidth
          onClick={onEdit}
        >
          Change my mind
        </Button>
      </div>
    </div>
  );
}
