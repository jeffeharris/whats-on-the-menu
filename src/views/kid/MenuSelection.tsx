import { useState } from 'react';
import { Button } from '../../components/common/Button';
import { FoodCard } from '../../components/kid/FoodCard';
import { CategorySection } from '../../components/kid/CategorySection';
import { KidAvatar } from '../../components/kid/KidAvatar';
import { useFoodLibrary } from '../../contexts/FoodLibraryContext';
import { useKidProfiles } from '../../contexts/KidProfilesContext';
import { useMenu } from '../../contexts/MenuContext';

interface MenuSelectionProps {
  kidId: string;
  onComplete: () => void;
  onBack: () => void;
}

export function MenuSelection({ kidId, onComplete, onBack }: MenuSelectionProps) {
  const { getItem } = useFoodLibrary();
  const { getProfile } = useKidProfiles();
  const { currentMenu, addSelection, getSelectionForKid } = useMenu();

  const kid = getProfile(kidId);
  const existingSelection = getSelectionForKid(kidId);

  const [selectedMain, setSelectedMain] = useState<string | null>(
    existingSelection?.mainId || null
  );
  const [selectedSides, setSelectedSides] = useState<string[]>(
    existingSelection?.sideIds || []
  );

  if (!currentMenu || !kid) {
    return null;
  }

  const mainItems = currentMenu.mains.map((id) => getItem(id)).filter(Boolean);
  const sideItems = currentMenu.sides.map((id) => getItem(id)).filter(Boolean);

  const handleMainSelect = (id: string) => {
    setSelectedMain(id === selectedMain ? null : id);
  };

  const handleSideSelect = (id: string) => {
    if (selectedSides.includes(id)) {
      setSelectedSides(selectedSides.filter((s) => s !== id));
    } else if (selectedSides.length < 2) {
      setSelectedSides([...selectedSides, id]);
    }
  };

  const canConfirm = selectedMain !== null && selectedSides.length >= 1;

  const handleConfirm = async () => {
    await addSelection(kidId, selectedMain, selectedSides);
    onComplete();
  };

  return (
    <div className="h-full bg-kid-bg flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center gap-4 p-4 md:p-6 pb-0 max-w-3xl mx-auto w-full">
        <button
          onClick={onBack}
          className="p-2 hover:bg-white/50 rounded-lg transition-colors"
          aria-label="Go back"
        >
          <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-3 flex-1">
          <KidAvatar name={kid.name} color={kid.avatarColor} size="md" />
          <div>
            <p className="text-gray-500 text-sm">Picking for</p>
            <h1 className="text-2xl font-bold text-gray-800">{kid.name}</h1>
          </div>
        </div>
      </header>

      {/* Scrollable Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pt-4">
        {/* Main selection */}
        <CategorySection
        title="Pick your yummy main!"
        subtitle="Choose 1"
      >
        {mainItems.map((item) => item && (
          <FoodCard
            key={item.id}
            name={item.name}
            imageUrl={item.imageUrl}
            selected={selectedMain === item.id}
            onClick={() => handleMainSelect(item.id)}
            responsive
          />
        ))}
      </CategorySection>

      {/* Sides selection */}
      <CategorySection
        title="Pick your sides!"
        subtitle="Choose 1 or 2"
      >
        {sideItems.map((item) => item && (
          <FoodCard
            key={item.id}
            name={item.name}
            imageUrl={item.imageUrl}
            selected={selectedSides.includes(item.id)}
            onClick={() => handleSideSelect(item.id)}
            responsive
          />
        ))}
      </CategorySection>
      </main>

      {/* Fixed Footer */}
      <footer className="flex-shrink-0 p-4 md:p-6 bg-kid-bg border-t border-kid-primary/10">
        <div className="max-w-xl mx-auto">
          <Button
            mode="kid"
            variant="primary"
            size="touch"
            fullWidth
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            {canConfirm ? "All done!" : "Pick your food first!"}
          </Button>
        </div>
      </footer>
    </div>
  );
}
