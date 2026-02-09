import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppStateProvider, useAppState } from './contexts/AppStateContext';
import { FoodLibraryProvider } from './contexts/FoodLibraryContext';
import { KidProfilesProvider } from './contexts/KidProfilesContext';
import { MenuProvider, useMenu } from './contexts/MenuContext';
import { MealHistoryProvider } from './contexts/MealHistoryContext';
import { SharedMenuProvider } from './contexts/SharedMenuContext';

const FEATURE_SHARED_MENUS = import.meta.env.VITE_FEATURE_SHARED_MENUS === 'true';

// Auth views
import { LoginPage } from './views/auth/LoginPage';
import { SignupPage } from './views/auth/SignupPage';
import { VerifyPage } from './views/auth/VerifyPage';
import { CheckEmailPage } from './views/auth/CheckEmailPage';
import { AcceptInvitePage } from './views/auth/AcceptInvitePage';

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
import { FamilyStars } from './views/kid/FamilyStars';

// Public views
import { SharedMenuView } from './views/public/SharedMenuView';
import { LandingPage } from './views/LandingPage';
import { TermsPage } from './views/legal/TermsPage';
import { PrivacyPage } from './views/legal/PrivacyPage';

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

  return <KidModeHome onSelectKid={handleSelectKid} onConfirmSelections={handleConfirmSelections} onNavigateToStars={() => navigate('/kid/stars')} />;
}

function FamilyStarsRoute() {
  const navigate = useNavigate();
  return <FamilyStars onBack={() => navigate('/')} />;
}

function MenuSelectionRoute() {
  const navigate = useNavigate();
  const { kidId } = useParams<{ kidId: string }>();
  const { selectKid } = useAppState();

  // Ensure kid is selected in context (must be in useEffect, not during render)
  useEffect(() => {
    if (kidId) {
      selectKid(kidId);
    }
  }, [kidId, selectKid]);

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

  // Ensure kid is selected in context (must be in useEffect, not during render)
  useEffect(() => {
    if (kidId) {
      selectKid(kidId);
    }
  }, [kidId, selectKid]);

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

// Loading screen for auth state resolution
function LoadingScreen() {
  return (
    <div className="min-h-dvh bg-[var(--color-parent-bg)] flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-[var(--color-parent-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500">Loading...</p>
      </div>
    </div>
  );
}

// Main routing component that checks auth state
function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();
  const { mode, isParentAuthenticated } = useAppState();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      {/* Public routes — always accessible */}
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/auth/verify" element={<VerifyPage />} />
      <Route path="/auth/check-email" element={<CheckEmailPage />} />
      <Route path="/share/:token" element={<SharedMenuViewRoute />} />
      <Route path="/invite/accept" element={<AcceptInvitePage />} />

      {/* Protected routes — require authentication */}
      {isAuthenticated ? (
        <>
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/signup" element={<Navigate to="/" replace />} />
          {mode === 'parent' && isParentAuthenticated ? (
            <>
              {/* All existing parent routes */}
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
              <Route path="*" element={<ParentDashboardRoute />} />
            </>
          ) : (
            <>
              {/* All existing kid routes */}
              <Route path="/" element={<KidModeHomeRoute />} />
              <Route path="/kid/stars" element={<FamilyStarsRoute />} />
              <Route path="/kid/select/:kidId" element={<MenuSelectionRoute />} />
              <Route path="/kid/confirm/:kidId" element={<PlateConfirmationRoute />} />
              <Route path="/meal-review" element={<MealReviewRoute />} />
              <Route path="*" element={<KidModeHomeRoute />} />
            </>
          )}
        </>
      ) : (
        <>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </>
      )}
    </Routes>
  );
}

function App() {
  const content = (
    <BrowserRouter>
      <AuthProvider>
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
      </AuthProvider>
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
