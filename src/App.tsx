import { useState } from 'react';
import { AppStateProvider, useAppState } from './contexts/AppStateContext';
import { FoodLibraryProvider } from './contexts/FoodLibraryContext';
import { KidProfilesProvider } from './contexts/KidProfilesContext';
import { MenuProvider, useMenu } from './contexts/MenuContext';

// Parent views
import { ParentDashboard } from './views/parent/ParentDashboard';
import { FoodLibrary } from './views/parent/FoodLibrary';
import { KidProfiles } from './views/parent/KidProfiles';
import { MenuBuilder } from './views/parent/MenuBuilder';
import { Settings } from './views/parent/Settings';

// Kid views
import { KidModeHome } from './views/kid/KidModeHome';
import { MenuSelection } from './views/kid/MenuSelection';
import { PlateConfirmation } from './views/kid/PlateConfirmation';

type ParentView = 'dashboard' | 'food-library' | 'kid-profiles' | 'menu-builder' | 'settings';
type KidView = 'home' | 'selection' | 'confirmation';

function AppContent() {
  const { mode, isParentAuthenticated, selectedKidId, selectKid } = useAppState();
  const { hasKidSelected } = useMenu();

  // Parent mode navigation
  const [parentView, setParentView] = useState<ParentView>('dashboard');

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
      default:
        return <ParentDashboard onNavigate={setParentView} />;
    }
  }

  // Kid Mode
  const handleSelectKid = (kidId: string) => {
    selectKid(kidId);
    // If kid already selected, show confirmation
    if (hasKidSelected(kidId)) {
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

  return <KidModeHome onSelectKid={handleSelectKid} />;
}

function App() {
  return (
    <AppStateProvider>
      <FoodLibraryProvider>
        <KidProfilesProvider>
          <MenuProvider>
            <AppContent />
          </MenuProvider>
        </KidProfilesProvider>
      </FoodLibraryProvider>
    </AppStateProvider>
  );
}

export default App;
