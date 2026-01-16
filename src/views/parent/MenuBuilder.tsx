import { useState, useEffect } from 'react';
import { Button } from '../../components/common/Button';
import { MenuBuilderGrid } from '../../components/parent/MenuBuilderGrid';
import { useFoodLibrary } from '../../contexts/FoodLibraryContext';
import { useMenu } from '../../contexts/MenuContext';
import { useAppState } from '../../contexts/AppStateContext';

interface MenuBuilderProps {
  onBack: () => void;
}

export function MenuBuilder({ onBack }: MenuBuilderProps) {
  const { items, getItemsByCategory } = useFoodLibrary();
  const { currentMenu, createMenu, clearMenu } = useMenu();
  const { setMode } = useAppState();

  const [selectedMains, setSelectedMains] = useState<string[]>(currentMenu?.mains || []);
  const [selectedSides, setSelectedSides] = useState<string[]>(currentMenu?.sides || []);

  const mains = getItemsByCategory('main');
  const sides = getItemsByCategory('side');

  // Sync with current menu
  useEffect(() => {
    if (currentMenu) {
      setSelectedMains(currentMenu.mains);
      setSelectedSides(currentMenu.sides);
    }
  }, [currentMenu]);

  const canSave = selectedMains.length >= 2 && selectedSides.length >= 2;

  const handleSave = async () => {
    await createMenu(selectedMains, selectedSides);
  };

  const handleLaunch = async () => {
    if (!currentMenu && canSave) {
      await createMenu(selectedMains, selectedSides);
    }
    setMode('kid');
  };

  const handleClear = async () => {
    if (confirm('Are you sure you want to clear the current menu?')) {
      await clearMenu();
      setSelectedMains([]);
      setSelectedSides([]);
    }
  };

  const hasChanges =
    currentMenu &&
    (JSON.stringify(selectedMains.sort()) !== JSON.stringify([...currentMenu.mains].sort()) ||
      JSON.stringify(selectedSides.sort()) !== JSON.stringify([...currentMenu.sides].sort()));

  return (
    <div className="min-h-screen bg-parent-bg p-4">
      <header className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Go back"
        >
          <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-gray-800 flex-1">Menu Builder</h1>
      </header>

      <div className="max-w-2xl mx-auto">
        {items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">
              You need to add some food items first!
            </p>
            <Button variant="primary" onClick={onBack}>
              Go to Food Library
            </Button>
          </div>
        ) : (
          <>
            <MenuBuilderGrid
              items={mains}
              selectedIds={selectedMains}
              onSelectionChange={setSelectedMains}
              minSelection={2}
              maxSelection={3}
              title="Main Dishes"
            />

            <MenuBuilderGrid
              items={sides}
              selectedIds={selectedSides}
              onSelectionChange={setSelectedSides}
              minSelection={2}
              maxSelection={4}
              title="Side Dishes"
            />

            {/* Validation message */}
            {!canSave && (
              <p className="text-center text-warning mb-4">
                Select at least 2 mains and 2 sides to create a menu
              </p>
            )}

            {/* Action buttons */}
            <div className="flex flex-col gap-3 mt-8">
              {hasChanges && (
                <Button variant="secondary" fullWidth onClick={handleSave}>
                  Save Changes
                </Button>
              )}

              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={handleLaunch}
                disabled={!canSave && !currentMenu}
              >
                {currentMenu ? 'Launch Kid Mode' : 'Save & Launch Kid Mode'}
              </Button>

              {currentMenu && (
                <Button variant="ghost" fullWidth onClick={handleClear}>
                  Clear Menu
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
