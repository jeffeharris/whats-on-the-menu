import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { QuickLaunchPresets } from '../../components/parent/QuickLaunchPresets';
import { useAppState } from '../../contexts/AppStateContext';
import { useFoodLibrary } from '../../contexts/FoodLibraryContext';
import { useKidProfiles } from '../../contexts/KidProfilesContext';
import { useMenu } from '../../contexts/MenuContext';
import { useMealHistory } from '../../contexts/MealHistoryContext';
import type { PresetSlot } from '../../types';

const FEATURE_SHARED_MENUS = import.meta.env.VITE_FEATURE_SHARED_MENUS === 'true';

interface ParentDashboardProps {
  onNavigate: (view: 'food-library' | 'kid-profiles' | 'menu-builder' | 'settings' | 'meal-history-list' | 'shared-menus-list') => void;
}

export function ParentDashboard({ onNavigate }: ParentDashboardProps) {
  const { logoutParent, setMode } = useAppState();
  const { items } = useFoodLibrary();
  const { profiles } = useKidProfiles();
  const { currentMenu, loadPresetAsActive, loadPreset } = useMenu();
  const { meals } = useMealHistory();

  const handleQuickLaunch = async (slot: PresetSlot) => {
    await loadPresetAsActive(slot);
    setMode('kid');
  };

  const handleQuickEdit = (slot: PresetSlot) => {
    loadPreset(slot);
    onNavigate('menu-builder');
  };

  return (
    <div className="h-full bg-parent-bg flex flex-col overflow-hidden">
      <header className="flex-shrink-0 flex justify-between items-center p-4 md:p-6 pb-0 max-w-2xl mx-auto w-full">
        <h1 className="text-2xl font-bold text-gray-800">Parent Dashboard</h1>
        <Button variant="ghost" size="sm" onClick={logoutParent}>
          Switch to Kid Mode
        </Button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-lg md:max-w-2xl mx-auto">
          {/* Quick Launch Presets */}
          <QuickLaunchPresets onLaunch={handleQuickLaunch} onEdit={handleQuickEdit} />

          <div className="grid gap-4 md:grid-cols-2">
        {/* Food Library */}
        <Card
          onClick={() => onNavigate('food-library')}
          className="hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-parent-primary/10 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-parent-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-gray-800">Food Library</h2>
              <p className="text-sm text-gray-500">
                {items.length} {items.length === 1 ? 'item' : 'items'}
              </p>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Card>

        {/* Kid Profiles */}
        <Card
          onClick={() => onNavigate('kid-profiles')}
          className="hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-parent-secondary/10 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-parent-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-gray-800">Kid Profiles</h2>
              <p className="text-sm text-gray-500">
                {profiles.length} {profiles.length === 1 ? 'kid' : 'kids'}
              </p>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Card>

        {/* Menu Builder */}
        <Card
          onClick={() => onNavigate('menu-builder')}
          className="hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-gray-800">Menu Builder</h2>
              <p className="text-sm text-gray-500">
                {currentMenu ? 'Menu is active' : 'No menu set'}
              </p>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Card>

        {/* Meal History */}
        <Card
          onClick={() => onNavigate('meal-history-list')}
          className="hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-gray-800">Meal History</h2>
              <p className="text-sm text-gray-500">
                {meals.length} {meals.length === 1 ? 'meal' : 'meals'} recorded
              </p>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Card>

        {/* Shared Menus */}
        {FEATURE_SHARED_MENUS && (
          <Card
            onClick={() => onNavigate('shared-menus-list')}
            className="hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-gray-800">Shared Menus</h2>
                <p className="text-sm text-gray-500">Create shareable links</p>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Card>
        )}

        {/* Settings */}
        <Card
          onClick={() => onNavigate('settings')}
          className="hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-gray-800">Settings</h2>
              <p className="text-sm text-gray-500">Change PIN</p>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
