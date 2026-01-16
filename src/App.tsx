import { useState } from 'react';
import { AppStateProvider, useAppState } from './contexts/AppStateContext';
import { FoodLibraryProvider } from './contexts/FoodLibraryContext';
import { KidProfilesProvider } from './contexts/KidProfilesContext';
import { MenuProvider, useMenu } from './contexts/MenuContext';
import { MealHistoryProvider } from './contexts/MealHistoryContext';

// Parent views
import { ParentDashboard } from './views/parent/ParentDashboard';
import { FoodLibrary } from './views/parent/FoodLibrary';
import { KidProfiles } from './views/parent/KidProfiles';
import { MenuBuilder } from './views/parent/MenuBuilder';
import { Settings } from './views/parent/Settings';
import { MealReview } from './views/parent/MealReview';
import { MealHistoryList } from './views/parent/MealHistoryList';
import { MealHistoryDetail } from './views/parent/MealHistoryDetail';

// Kid views
import { KidModeHome } from './views/kid/KidModeHome';
import { MenuSelection } from './views/kid/MenuSelection';
import { PlateConfirmation } from './views/kid/PlateConfirmation';

type ParentView = 'dashboard' | 'food-library' | 'kid-profiles' | 'menu-builder' | 'settings' | 'meal-review' | 'meal-history-list' | 'meal-history-detail';
type KidView = 'home' | 'selection' | 'confirmation';

function AppContent() {
  const { mode, isParentAuthenticated, selectedKidId, selectKid } = useAppState();
  const { hasKidSelected, selectionsLocked } = useMenu();

  // Parent mode navigation
  const [parentView, setParentView] = useState<ParentView>('dashboard');
  const [selectedMealId, setSelectedMealId] = useState<string | null>(null);

  // Kid mode navigation
  const [kidView, setKidView] = useState<KidView>('home');

  // Parent Mode
  if (mode === 'parent' && isParentAuthenticated) {
    switch (parentView) {
      case 'food-library':
        return <FoodLibrary onBack={() => setParentView('dashboard')} />;
      case 'kid-profiles':
        return <KidProfiles onBack={() => setParentView('dashboard')} />;
      case 'menu-builder':
        return <MenuBuilder onBack={() => setParentView('dashboard')} />;
      case 'settings':
        return <Settings onBack={() => setParentView('dashboard')} />;
      case 'meal-review':
        return (
          <MealReview
            onComplete={() => setParentView('dashboard')}
            onBack={() => setParentView('dashboard')}
          />
        );
      case 'meal-history-list':
        return (
          <MealHistoryList
            onBack={() => setParentView('dashboard')}
            onSelectMeal={(mealId) => {
              setSelectedMealId(mealId);
              setParentView('meal-history-detail');
            }}
          />
        );
      case 'meal-history-detail':
        if (selectedMealId) {
          return (
            <MealHistoryDetail
              mealId={selectedMealId}
              onBack={() => setParentView('meal-history-list')}
            />
          );
        }
        return <ParentDashboard onNavigate={setParentView} />;
      default:
        return <ParentDashboard onNavigate={setParentView} />;
    }
  }

  // Kid Mode
  const handleSelectKid = (kidId: string) => {
    selectKid(kidId);
    // If selections are locked or kid already selected, show confirmation (read-only if locked)
    if (selectionsLocked || hasKidSelected(kidId)) {
      setKidView('confirmation');
    } else {
      setKidView('selection');
    }
  };

  const handleSelectionComplete = () => {
    setKidView('confirmation');
  };

  const handleDone = () => {
    selectKid(null);
    setKidView('home');
  };

  const handleEditSelection = () => {
    setKidView('selection');
  };

  const handleBackToHome = () => {
    selectKid(null);
    setKidView('home');
  };

  const handleConfirmSelections = () => {
    // Navigate to parent mode meal review
    setParentView('meal-review');
  };

  switch (kidView) {
    case 'selection':
      if (selectedKidId) {
        return (
          <MenuSelection
            kidId={selectedKidId}
            onComplete={handleSelectionComplete}
            onBack={handleBackToHome}
          />
        );
      }
      break;
    case 'confirmation':
      if (selectedKidId) {
        return (
          <PlateConfirmation
            kidId={selectedKidId}
            onDone={handleDone}
            onEdit={handleEditSelection}
          />
        );
      }
      break;
  }

  return <KidModeHome onSelectKid={handleSelectKid} onConfirmSelections={handleConfirmSelections} />;
}

function App() {
  return (
    <AppStateProvider>
      <FoodLibraryProvider>
        <KidProfilesProvider>
          <MenuProvider>
            <MealHistoryProvider>
              <AppContent />
            </MealHistoryProvider>
          </MenuProvider>
        </KidProfilesProvider>
      </FoodLibraryProvider>
    </AppStateProvider>
  );
}

export default App;
