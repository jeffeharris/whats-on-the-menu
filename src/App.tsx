import { BrowserRouter, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { AppStateProvider, useAppState } from './contexts/AppStateContext';
import { FoodLibraryProvider } from './contexts/FoodLibraryContext';
import { KidProfilesProvider } from './contexts/KidProfilesContext';
import { MenuProvider, useMenu } from './contexts/MenuContext';
import { MealHistoryProvider } from './contexts/MealHistoryContext';
import { SharedMenuProvider } from './contexts/SharedMenuContext';

const FEATURE_SHARED_MENUS = import.meta.env.VITE_FEATURE_SHARED_MENUS === 'true';

// Parent views
import { ParentDashboard } from './views/parent/ParentDashboard';
import { FoodLibrary } from './views/parent/FoodLibrary';
import { KidProfiles } from './views/parent/KidProfiles';
import { MenuBuilder } from './views/parent/MenuBuilder';
import { Settings } from './views/parent/Settings';
import { MealReview } from './views/parent/MealReview';
import { MealHistoryList } from './views/parent/MealHistoryList';
import { MealHistoryDetail } from './views/parent/MealHistoryDetail';
import { SharedMenusList } from './views/parent/SharedMenusList';
import { SharedMenuBuilder } from './views/parent/SharedMenuBuilder';
import { SharedMenuResponses } from './views/parent/SharedMenuResponses';

// Kid views
import { KidModeHome } from './views/kid/KidModeHome';
import { MenuSelection } from './views/kid/MenuSelection';
import { PlateConfirmation } from './views/kid/PlateConfirmation';

// Public views
import { SharedMenuView } from './views/public/SharedMenuView';

// Route wrapper components for parent views
function ParentDashboardRoute() {
  const navigate = useNavigate();
  return <ParentDashboard onNavigate={(view) => {
    const routes: Record<string, string> = {
      'dashboard': '/',
      'food-library': '/food-library',
      'kid-profiles': '/kid-profiles',
      'menu-builder': '/menu-builder',
      'settings': '/settings',
      'meal-review': '/meal-review',
      'meal-history-list': '/meal-history',
      'shared-menus-list': '/shared-menus',
    };
    navigate(routes[view] || '/');
  }} />;
}

function FoodLibraryRoute() {
  const navigate = useNavigate();
  return <FoodLibrary onBack={() => navigate('/')} />;
}

function KidProfilesRoute() {
  const navigate = useNavigate();
  return <KidProfiles onBack={() => navigate('/')} />;
}

function MenuBuilderRoute() {
  const navigate = useNavigate();
  return <MenuBuilder onBack={() => navigate('/')} />;
}

function SettingsRoute() {
  const navigate = useNavigate();
  return <Settings onBack={() => navigate('/')} />;
}

function MealReviewRoute() {
  const navigate = useNavigate();
  return (
    <MealReview
      onComplete={() => navigate('/')}
      onBack={() => navigate('/')}
    />
  );
}

function MealHistoryListRoute() {
  const navigate = useNavigate();
  return (
    <MealHistoryList
      onBack={() => navigate('/')}
      onSelectMeal={(mealId) => navigate(`/meal-history/${mealId}`)}
    />
  );
}

function MealHistoryDetailRoute() {
  const navigate = useNavigate();
  const { mealId } = useParams<{ mealId: string }>();

  if (!mealId) {
    navigate('/meal-history');
    return null;
  }

  return (
    <MealHistoryDetail
      mealId={mealId}
      onBack={() => navigate('/meal-history')}
    />
  );
}

function SharedMenusListRoute() {
  const navigate = useNavigate();
  return (
    <SharedMenusList
      onBack={() => navigate('/')}
      onCreateNew={() => navigate('/shared-menus/new')}
      onViewResponses={(menuId) => navigate(`/shared-menus/${menuId}/responses`)}
    />
  );
}

function SharedMenuBuilderRoute() {
  const navigate = useNavigate();
  return (
    <SharedMenuBuilder
      onBack={() => navigate('/shared-menus')}
      onSuccess={(menuId) => navigate(`/shared-menus/${menuId}/responses`)}
    />
  );
}

function SharedMenuResponsesRoute() {
  const navigate = useNavigate();
  const { menuId } = useParams<{ menuId: string }>();

  if (!menuId) {
    navigate('/shared-menus');
    return null;
  }

  return (
    <SharedMenuResponses
      menuId={menuId}
      onBack={() => navigate('/shared-menus')}
    />
  );
}

function SharedMenuViewRoute() {
  const { token } = useParams<{ token: string }>();

  if (!token) {
    return <div>Invalid share link</div>;
  }

  return <SharedMenuView token={token} />;
}

// Kid mode route components
function KidModeHomeRoute() {
  const navigate = useNavigate();
  const { selectKid } = useAppState();
  const { hasKidSelected, selectionsLocked } = useMenu();

  const handleSelectKid = (kidId: string) => {
    selectKid(kidId);
    if (selectionsLocked || hasKidSelected(kidId)) {
      navigate(`/kid/confirm/${kidId}`);
    } else {
      navigate(`/kid/select/${kidId}`);
    }
  };

  const handleConfirmSelections = () => {
    navigate('/meal-review');
  };

  return <KidModeHome onSelectKid={handleSelectKid} onConfirmSelections={handleConfirmSelections} />;
}

function MenuSelectionRoute() {
  const navigate = useNavigate();
  const { kidId } = useParams<{ kidId: string }>();
  const { selectKid } = useAppState();

  // Ensure kid is selected in context
  if (kidId) {
    selectKid(kidId);
  }

  if (!kidId) {
    navigate('/');
    return null;
  }

  return (
    <MenuSelection
      kidId={kidId}
      onComplete={() => navigate(`/kid/confirm/${kidId}`)}
      onBack={() => {
        selectKid(null);
        navigate('/');
      }}
    />
  );
}

function PlateConfirmationRoute() {
  const navigate = useNavigate();
  const { kidId } = useParams<{ kidId: string }>();
  const { selectKid } = useAppState();

  // Ensure kid is selected in context
  if (kidId) {
    selectKid(kidId);
  }

  if (!kidId) {
    navigate('/');
    return null;
  }

  return (
    <PlateConfirmation
      kidId={kidId}
      onDone={() => {
        selectKid(null);
        navigate('/');
      }}
      onEdit={() => navigate(`/kid/select/${kidId}`)}
    />
  );
}

// Main routing component that checks auth state
function AppRoutes() {
  const { mode, isParentAuthenticated } = useAppState();

  // Parent mode routes (when authenticated)
  if (mode === 'parent' && isParentAuthenticated) {
    return (
      <Routes>
        <Route path="/" element={<ParentDashboardRoute />} />
        <Route path="/food-library" element={<FoodLibraryRoute />} />
        <Route path="/kid-profiles" element={<KidProfilesRoute />} />
        <Route path="/menu-builder" element={<MenuBuilderRoute />} />
        <Route path="/settings" element={<SettingsRoute />} />
        <Route path="/meal-review" element={<MealReviewRoute />} />
        <Route path="/meal-history" element={<MealHistoryListRoute />} />
        <Route path="/meal-history/:mealId" element={<MealHistoryDetailRoute />} />
        {FEATURE_SHARED_MENUS && (
          <>
            <Route path="/shared-menus" element={<SharedMenusListRoute />} />
            <Route path="/shared-menus/new" element={<SharedMenuBuilderRoute />} />
            <Route path="/shared-menus/:menuId/responses" element={<SharedMenuResponsesRoute />} />
          </>
        )}
        <Route path="/share/:token" element={<SharedMenuViewRoute />} />
        <Route path="*" element={<ParentDashboardRoute />} />
      </Routes>
    );
  }

  // Kid mode routes (default)
  return (
    <Routes>
      <Route path="/" element={<KidModeHomeRoute />} />
      <Route path="/kid/select/:kidId" element={<MenuSelectionRoute />} />
      <Route path="/kid/confirm/:kidId" element={<PlateConfirmationRoute />} />
      <Route path="/meal-review" element={<MealReviewRoute />} />
      <Route path="/share/:token" element={<SharedMenuViewRoute />} />
      <Route path="*" element={<KidModeHomeRoute />} />
    </Routes>
  );
}

function App() {
  const content = (
    <BrowserRouter>
      <AppStateProvider>
        <FoodLibraryProvider>
          <KidProfilesProvider>
            <MenuProvider>
              <MealHistoryProvider>
                <AppRoutes />
              </MealHistoryProvider>
            </MenuProvider>
          </KidProfilesProvider>
        </FoodLibraryProvider>
      </AppStateProvider>
    </BrowserRouter>
  );

  // Wrap with SharedMenuProvider only if feature is enabled
  if (FEATURE_SHARED_MENUS) {
    return (
      <SharedMenuProvider>
        {content}
      </SharedMenuProvider>
    );
  }

  return content;
}

export default App;
